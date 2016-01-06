(function (d3) {

    "use strict";
    
    var DEFAULT_SCENE_OBJECT_TYPE = '__DSOT__';

    window.D3Scene = function D3Scene(selector, options) {

        options = options || {};

        this.sceneContainer = selector instanceof d3.selection ? selector : d3.select(selector);
        this.sceneObjectClass = options.sceneObjectClass || 'd3-scene-' + (+new Date() * Math.random()).toString(36).substring(0, 7);
        this.keyField = options.keyField || 'id';

        this.sceneObjectsDef = {};
        this.sceneData = null;
        this.updateSelection = null;
    };

    D3Scene.prototype.setSceneObjectDefinition = function (type, definition) {
        if (typeof definition === 'undefined') {
            return this.setSceneObjectDefinition(DEFAULT_SCENE_OBJECT_TYPE, type);
        }
        if (typeof definition.create !== 'function') {
            throw new Error('Bad scene object definition, create method is missing.');
        }
        this.sceneObjectsDef[type] = definition;
        return this;
    };

    D3Scene.prototype.setSceneObjectDefinitions = function (definitions) {
        var type;
        for (type in definitions) {
            this.setSceneObjectDefinition(type, definitions[type]);
        }
        return this;
    };

    D3Scene.prototype.data = function (newData) {
        if (newData) {
            this.sceneData = newData;
            return this;
        }
        return this.sceneData;
    };

    D3Scene.prototype.update = function (shouldRejoinData, transitionOptions) {
        var self = this;
        if (!this.updateSelection || shouldRejoinData) {
            d3_enter.call(this);
            d3_exit.call(this);
        }

        this.updateSelection.each(function (data) {
            var objectType = data.type || DEFAULT_SCENE_OBJECT_TYPE;
            var selection = d3.select(this);
            selection = applyTransition(selection, data, transitionOptions);
            self.sceneObjectsDef[objectType].update(selection, data);
        });
        return this;
    };

    function key_function (data) {
        return data[this.keyField];
    }

    function createSceneObject (data) {
        var objectType = data.type || DEFAULT_SCENE_OBJECT_TYPE;
        
        var objectDef = this.sceneObjectsDef[objectType];

        if (!objectDef)
            throw Error ('Scene object of type [' + objectType + '] is not defined.');

        if (typeof objectDef.create != 'function')
            throw Error ('Can not create scene object of type [' + objectType +'], create method is missing in the scene object deffinition');

        var sceneObject = objectDef.create(data);
        if (sceneObject instanceof d3.selection)
            sceneObject = sceneObject[0][0];
        
        var sceneObjectD3 = d3.select(sceneObject).classed(this.sceneObjectClass, true);

        if (objectDef.update)
            objectDef.update(sceneObjectD3, data);

       return sceneObject;
    }

    function applyTransition (selection, data, transitionOptions) {
        transitionOptions = data.transitionOptions || transitionOptions;
        if (transitionOptions) {
            selection = selection.transition();
            if (transitionOptions.duration) selection.duration(transitionOptions.duration);
            if (transitionOptions.delay) selection.duration(transitionOptions.delay);
            if (transitionOptions.ease) selection.ease(transitionOptions.ease);
        }
        return selection;
    }

    function d3_enter() {
        var self = this;
        self.updateSelection = self.sceneContainer
            .selectAll('.' + this.sceneObjectClass)
            .data(self.sceneData, function(data) {
                return key_function.call(self, data);
            });

        self.updateSelection.enter().append(function(data){
            return createSceneObject.call(self, data);
        });
    }

    function d3_exit() {
        var self = this;
        self.updateSelection.exit().each(function(data){
            var objectType = data.type || DEFAULT_SCENE_OBJECT_TYPE;
            if (self.sceneObjectsDef[objectType].remove)
                self.sceneObjectsDef[objectType].remove(this, data);
            else
                this.remove();
        });
    }

})(d3)