(function (scope) {

    /**
     * String input component
     *
     * @class StringInputComponent
     * @extends AbstractComponent
     * @constructor
     */
    function StringInputComponent () {
        this.type = 'string';
    }

    /**
     * Inheritance property
     */
    StringInputComponent.prototype = new scope.AbstractComponent();

    /**
     * Constructor property
     */
    StringInputComponent.prototype.constructor = StringInputComponent;

    /**
     * Get string
     *
     * @method getString
     * @returns {String}
     */
    StringInputComponent.prototype.getString = function () {
        return this.string;
    };

    /**
     * Set string
     *
     * @method setString
     * @param {String} string
     */
    StringInputComponent.prototype.setString = function (string) {
        this.string = string;
    };

    /**
     * Get input component bounding box
     *
     * @method getBoundingBox
     * @returns {Rectangle}
     */
    StringInputComponent.prototype.getBoundingBox = function () {
        return this.boundingBox;
    };

    /**
     * Set input component bounding box
     *
     * @method setBoundingBox
     * @param {Rectangle} boundingBox
     */
    StringInputComponent.prototype.setBoundingBox = function (boundingBox) {
        this.boundingBox = boundingBox;
    };

    // Export
    scope.StringInputComponent = StringInputComponent;
})(MyScript);