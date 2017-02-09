import { recognizerLogger as logger } from '../../../configuration/LoggerConfig';
import MyScriptJSConstants from '../../../configuration/MyScriptJSConstants';
import * as StrokeComponent from '../../../model/StrokeComponent';
import * as CryptoHelper from '../../CryptoHelper';
import * as RecognizerContext from '../../../model/RecognizerContext';
import * as Cdkv3RestRecognizerUtil from './Cdkv3RestRecognizerUtil';
import { extractShapeSymbols, getStyleFromInkRanges } from '../common/Cdkv3CommonShapeRecognizer';

export { init, close, reset } from '../../DefaultRecognizer';

/**
 * Recognizer configuration
 * @type {RecognizerInfo}
 */
export const analyzerRestV3Configuration = {
  type: MyScriptJSConstants.RecognitionType.ANALYZER,
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
  return analyzerRestV3Configuration;
}

function buildInput(options, model, recognizerContext) {
  const sendMessage = (message) => {
    RecognizerContext.updateSentRecognitionPositions(recognizerContext, model);
    return message;
  };

  const input = {
    // Incremental
    components: model.rawStrokes.map(stroke => StrokeComponent.toJSON(stroke))
  };
  Object.assign(input, { parameter: options.recognitionParams.analyzerParameter }); // Building the input with the suitable parameters

  logger.debug(`input.components size is ${input.components.length}`);

  const data = {
    instanceId: recognizerContext ? recognizerContext.instanceId : undefined,
    applicationKey: options.recognitionParams.server.applicationKey,
    analyzerInput: JSON.stringify(input)
  };

  if (options.recognitionParams.server.hmacKey) {
    data.hmac = CryptoHelper.computeHmac(data.analyzerInput, options.recognitionParams.server.applicationKey, options.recognitionParams.server.hmacKey);
  }
  return sendMessage(data);
}

function extractSymbols(model, element) {
  const style = getStyleFromInkRanges(model, element.inkRanges);
  switch (element.elementType) {
    case 'table':
      return element.lines.map(line => Object.assign(line, style));
    case 'textLine':
      return [element].map(textLine => Object.assign(textLine, textLine.result.textSegmentResult.candidates[textLine.result.textSegmentResult.selectedCandidateIdx], style));
    case 'shape':
      return extractShapeSymbols(model, element).map(primitive => Object.assign(primitive, style));
    default:
      return [];
  }
}

function extractRecognizedSymbolsFromAnalyzerResult(model) {
  const result = model.rawResult.result;
  if (result) {
    return [...result.shapes, ...result.tables, ...result.textLines]
        .map(element => extractSymbols(model, element))
        .reduce((a, b) => a.concat(b));
  }
  return [];
}

function resultCallback(model) {
  logger.debug('Cdkv3RestAnalyzerRecognizer result callback', model);
  const modelReference = model;
  modelReference.recognizedSymbols = extractRecognizedSymbolsFromAnalyzerResult(model);
  logger.debug('Cdkv3RestAnalyzerRecognizer model updated', modelReference);
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
  return Cdkv3RestRecognizerUtil.postMessage('/api/v3.0/recognition/rest/analyzer/doSimpleRecognition.json', options, model, recognizerContext, buildInput)
      .then(resultCallback);
}
