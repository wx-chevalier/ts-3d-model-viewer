// infoBox.js
// classes:
//  InfoBox
// description:
//  Hangs out in the corner and provides information.
//
//  Usage:
//   // for non-manual data
//   var box = new InfoBox();
//   box.add(title, source, props, def;
//   box.update(); // called manually to update the values in the box
//
//  Arguments for .add:
//   -title: title for the line in the info box
//   -source: closest unchanging reference to the requisite property
//   -props: a single property name, or an array of property names, that
//     lead to the data source
//   -def: default value if the line needs to be calculated
//
//  Prop names that are functions are called instead of dereferenced,
//   but this can be expensive.
//
//  Examples:
//   -If the requisite property is one reference away from the source, do:
//     box.add("foo", this, "count"); // or box.add("foo", this, ["count"]);
//   Then the value displayed will be this.count.
//   -If the datum comes from this.model.count, and model is not guaranteed
//   to reference the same object, then .add is called like:
//     box.add("foo", this, ["model", "count"]);
//   When calling .update(), the value displayed in the infobox will show
//   the value of this.model.count.


var InfoBox = (function() {

  // container for info lists
  function InfoBox(domElement, decimals) {
    domElement = domElement || document;

    this.container = document.createElement("div");
    this.container.id = "infoBox";
    document.body.appendChild(this.container);

    this.lists = {};

    this.addList("default");

    this.decimals = decimals !== undefined ? decimals : 4;
  }

  Object.assign(InfoBox.prototype, {

    // update all lists
    update: function() {
      for (var listName in this.lists) {
        this.lists[listName].update();
      }
    },

    // add a list to the InfoBox
    addList: function(name, title, color) {
      if (this.lists.hasOwnProperty(name)) return null;

      var list = new InfoList(name, title, color);

      list.parent = this;
      this.lists[name] = list;
      this.container.appendChild(list.container);

      return list;
    },

    // remove a list from the InfoBox
    removeList: function(list) {
      // never remove the default list
      if (list.name === "default") return;

      // do nothing if the list isn't in the box
      if (!this.lists.hasOwnProperty(list.name)) return;

      // remove the HTML node
      this.container.removeChild(list.container);

      // remove the lists entry
      delete this.lists[list.name];
    },

    // adding a line to the InfoBox adds it to the default list
    add: function(title, source, props, def) {
      this.lists.default.add(title, source, props, def);
    }

  });



  // a list that goes into the InfoBox
  function InfoList(name, title, color) {
    if (name === undefined || name === null) return;

    this.name = name;

    this.container = document.createElement("div");
    this.container.className = "listContainer";
    if (color !== undefined) this.container.style.border = "1px solid #" + color.toString(16);

    if (title !== undefined && title !== "default") {
      this.title = document.createElement("div");
      this.title.textContent = title;
      this.title.className = "listTitle";
      this.container.appendChild(this.title);
    }

    this.ul = document.createElement("ul");
    this.container.appendChild(this.ul);
    this.ul.className = "listUL";
    this.items = [];
  }

  Object.assign(InfoList.prototype, {
    // Add a line.
    add: function(title, source, props, def) {
      var liValueElement = this.createLine(title);

      if (!isArray(props)){
        props = [props];
      }

      this.items.push({
        value: liValueElement,
        source: source,
        props: props,
        def: def
      });
    },

    // Creates a line in the InfoList, returns HTML element that contains the value.
    createLine: function(title) {
      var li = document.createElement("li");
      li.className = "listLI";

      var liTitle = document.createElement("span");
      liTitle.className = "listLITitle";
      var liTitleText = document.createTextNode(title);
      liTitle.appendChild(liTitleText);

      li.appendChild(liTitle);

      var liValue = document.createElement("span");
      liValue.className = "listLIValue";

      li.appendChild(liValue);

      this.ul.appendChild(li);

      return liValue;
    },

    // Update the gettable values.
    update: function() {
      for (var itemIdx=0; itemIdx<this.items.length; itemIdx++) {
        var item = this.items[itemIdx];

        if (!item.source) {
          item.value.textContent = "";
          continue;
        }

        var value = this.getPropValue(item.source, item.props);

        if (value==="" && item.def) value = item.def;

        item.value.textContent = value;
      }
    },

    // Format numerical quantities; if int, return as-is.
    formatNumber: function(num) {
      if ((num%1)===0) return num;
      else return +num.toFixed(this.parent.decimals);
    },

    // Get the value of a prop as mapped through .add or .addMultiple.
    getPropValue: function(source, propPath) {
      for (var i=0; i<propPath.length; i++) {
        if (isFunction(source[propPath[i]])) source = source[propPath[i]]();
        else source = source[propPath[i]];
        if (source===null || source===undefined) return "";
      }
      var value;

      if (isNumber(source)) value = this.formatNumber(source);
      else if (source.isVector2) {
        value = "[";
        value += this.formatNumber(source.x);
        value += ", ";
        value += this.formatNumber(source.y);
        value += "]";
      }
      else if (source.isVector3) {
        value = "[";
        value += this.formatNumber(source.x);
        value += ", ";
        value += this.formatNumber(source.y);
        value += ", ";
        value += this.formatNumber(source.z);
        value += "]";
      }
      else value = source;

      return value;
    }

  });

  return InfoBox;

})();
