import { recognizerLogger as logger } from '../../../configuration/LoggerConfig';
import MyScriptJSConstants from '../../../configuration/MyScriptJSConstants';
import * as InkModel from '../../../model/InkModel';
import * as StrokeComponent from '../../../model/StrokeComponent';
import * as CryptoHelper from '../../CryptoHelper';
import * as RecognizerContext from '../../../model/RecognizerContext';
import * as Cdkv3RestRecognizerUtil from './Cdkv3RestRecognizerUtil';
import * as Cdkv3CommonShapeRecognizer from '../common/Cdkv3CommonShapeRecognizer';

export { init } from '../../DefaultRecognizer';

/**
 * Recognizer configuration
 * @type {RecognizerInfo}
 */
export const shapeRestV3Configuration = {
  type: MyScriptJSConstants.RecognitionType.SHAPE,
  protocol: MyScriptJSConstants.Protocol.REST,
  apiVersion: 'V3',
  availableTriggers: [
    MyScriptJSConstants.RecognitionTrigger.QUIET_PERIOD,
    MyScriptJSConstants.RecognitionTrigger.DEMAND
  ],
  preferredTrigger: MyScriptJSConstants.RecognitionTrigger.QUIET_PERIOD
};

/**
 * Get the configuration supported by this recognizer
 * @return {RecognizerInfo}
 */
export function getInfo() {
  return shapeRestV3Configuration;
}

function buildInput(options, model, recognizerContext) {
  const sendMessage = (message) => {
    RecognizerContext.updateSentRecognitionPositions(recognizerContext, model);
    return message;
  };

  const input = {
    components: InkModel.extractPendingStrokes(model).map(stroke => StrokeComponent.toJSON(stroke))
  };
  Object.assign(input, options.recognitionParams.shapeParameter); // Building the input with the suitable parameters

  logger.debug(`input.components size is ${input.components.length}`);

  const data = {
    instanceId: recognizerContext ? recognizerContext.instanceId : undefined,
    applicationKey: options.recognitionParams.server.applicationKey,
    shapeInput: JSON.stringify(input)
  };

  if (options.recognitionParams.server.hmacKey) {
    data.hmac = CryptoHelper.computeHmac(data.shapeInput, options.recognitionParams.server.applicationKey, options.recognitionParams.server.hmacKey);
  }
  return sendMessage(data);
}

function buildReset(options, model, recognizerContext) {
  return {
    instanceSessionId: recognizerContext ? recognizerContext.instanceId : undefined
  };
}

function resultCallback(model) {
  logger.debug('Cdkv3RestShapeRecognizer result callback', model);
  const modelReference = model;
  modelReference.recognizedSymbols = Cdkv3CommonShapeRecognizer.extractRecognizedSymbols(model);
  logger.debug('Cdkv3RestShapeRecognizer model updated', modelReference);
  return modelReference;
}

function resetCallback(model) {
  logger.debug('Cdkv3RestShapeRecognizer reset callback', model);
  const modelReference = InkModel.resetModelPositions(model);
  logger.debug('Cdkv3RestShapeRecognizer model updated', modelReference);
  return modelReference;
}

/**
 * Do the recognition
 * @param {Options} options Current configuration
 * @param {Model} model Current model
 * @param {RecognizerContext} recognizerContext Current recognizer context
 * @return {Promise.<Model>} Promise that return an updated model as a result
 */
export function recognize(options, model, recognizerContext) {
  return Cdkv3RestRecognizerUtil.postMessage('/api/v3.0/recognition/rest/shape/doSimpleRecognition.json', options, model, recognizerContext, buildInput)
      .then(resultCallback);
}

/**
 * Do what is needed to clean the server context.
 * @param {Options} options Current configuration
 * @param {Model} model Current model
 * @param {RecognizerContext} recognizerContext Current recognizer context
 * @return {Promise.<Model>}
 */
export function reset(options, model, recognizerContext) {
  return new Promise((resolve) => {
    if (recognizerContext && recognizerContext.instanceId) {
      resolve(Cdkv3RestRecognizerUtil.postMessage('/api/v3.0/recognition/rest/shape/clearSessionId.json', options, model, recognizerContext, buildReset)
                  .then(
                      (modelResponse) => {
                        const recognizerContextReference = RecognizerContext.resetRecognitionPositions(recognizerContext);
                        delete recognizerContextReference.instanceId;
                        return resetCallback(modelResponse);
                      }
                  ));
    } else {
      resolve(model);
    }
  });
}

/**
 * Do what is needed to clean the server context.
 * @param {Options} options Current configuration
 * @param {Model} model Current model
 * @param {RecognizerContext} recognizerContext Current recognizer context
 * @return {Promise.<Model>}
 */
export function close(options, model, recognizerContext) {
  return reset(options, model, recognizerContext);
}
