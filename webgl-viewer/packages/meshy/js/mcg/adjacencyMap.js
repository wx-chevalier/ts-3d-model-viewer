MCG.AdjacencyMap = (function() {

  function AdjacencyMap(context) {
    this.context = context;

    this.type = MCG.Types.abstractAdjacencyMap;
  }

  return AdjacencyMap;

})();



MCG.DirectedAdjacencyMap = (function() {

  function DirectedAdjacencyMap(context) {
    MCG.AdjacencyMap.call(this, context);

    this.map = {};

    this.type = MCG.Types.directedAdjacencyMap;
  }

  DirectedAdjacencyMap.prototype.addSegment = function(s) {
    var m = this.map;

    var p1 = s.p1;
    var p2 = s.p2;
    var hash1 = p1.hash();
    var hash2 = p2.hash();

    if (!m.hasOwnProperty(hash1)) {
      m[hash1] = new MCG.AdjacencyMapNode(p1, this.context);
    }
    if (!m.hasOwnProperty(hash2)) {
      m[hash2] = new MCG.AdjacencyMapNode(p2, this.context);
    }

    var node1 = m[hash1];
    var node2 = m[hash2];

    node1.addNode(node2);
  }

  DirectedAdjacencyMap.NodeSelectors = {
    noPredecessors: function(node) { return node.predcount === 0 && node.count > 0; },
    oneNeighbor: function(node) { return node.count === 1; },
    neighbors: function(node) { return node.count > 0; },
    noNeighbors: function(node) { return node.count === 0; }
  }

  DirectedAdjacencyMap.prototype.getKeyWithNoPredecessors = function() {
    return this.getKey(DirectedAdjacencyMap.NodeSelectors.noPredecessors);
  }

  DirectedAdjacencyMap.prototype.getKeyWithOneNeighbor = function() {
    return this.getKey(DirectedAdjacencyMap.NodeSelectors.oneNeighbor);
  }

  // get a key that has some neighbors; prioritize nodes with one neighbor
  DirectedAdjacencyMap.prototype.getKeyWithNeighbors = function() {
    res = this.getKey(DirectedAdjacencyMap.NodeSelectors.oneNeighbor);
    if (res) return res;

    return this.getKey(DirectedAdjacencyMap.NodeSelectors.neighbors);
  }

  DirectedAdjacencyMap.prototype.getKeyWithNoNeighbors = function() {
    return this.getKey(DirectedAdjacencyMap.NodeSelectors.noNeighbors);
  }

  // get the key to a node that satisfies selector sel
  DirectedAdjacencyMap.prototype.getKey = function(sel) {
    var m = this.map;
    if (sel === undefined) sel = DirectedAdjacencyMap.NodeSelectors.oneNeighbor;

    for (var key in m) {
      if (sel(m[key])) return key;
    }

    return null;
  }

  // return a loop of points
  // if allowOpen (true by default), get the open vertex loops first and count
  // them as closed, then the closed loops
  // NB: this mutates the adjacency map
  DirectedAdjacencyMap.prototype.getLoop = function(allowOpen) {
    var m = this.map;
    var _this = this;
    if (allowOpen === undefined) allowOpen = true;

    var startkey;

    // get a key from the map
    while ((startkey = getNewKey()) !== null) {
      var start = m[startkey];
      var current = start;
      var prev = null;

      var loop = [];

      // iterate until we circle back to the start
      do {
        loop.push(current.pt);

        var next = current.nextNode(prev);
        if (next === null) break;

        prev = current;
        current = next;
      } while (current !== start);

      // if complete loop, return that
      if (current === start || allowOpen) return loop;
    }

    // failed to find a loop
    return null;

    function getNewKey() {
      var key = null;

      // if allowing open polygons, find the start of an open vertex chain
      if (allowOpen) key = _this.getKeyWithNoPredecessors();

      // didn't find a key at the start of an open vertex chain; now just find
      // a key with some neighbors
      if (key === null) {
        key = _this.getKeyWithNeighbors();
        allowOpen = false;
      }

      return key;
    }
  }

  // return as many loops as the adjacency map has
  // NB: this mutates the adjacency map
  DirectedAdjacencyMap.prototype.getLoops = function() {
    var m = this.map;
    var loops = [];

    var loop = null;

    while ((loop = this.getLoop()) !== null) {
      loops.push(loop);
    }

    return loops;
  }

  return DirectedAdjacencyMap;
})();

MCG.AdjacencyMapNode = (function() {

  // one node signifies one point; a neighbor is another point
  // if count == 0, the node has no neighbor and is either isolated or at the end
  // of a (directed) chain of edges
  // if count == 1, the node points to one neighbor and a traversal can go to
  // that neighbor
  // if count > 1, the node has multiple outgoing directed paths; in that case,
  // neighbor information is recorded in the neighbors array
  function AdjacencyMapNode(pt, context) {
    this.pt = pt;
    this.count = 0;
    this.predcount = 0;

    // neighbor; is set if count === 1
    this.neighbor = null;
    // array of neighbor nodes; is set if count > 1
    this.neighbors = null;
  }

  // if no neighbors, set neighbor to other
  // if 1+ neighbors already exist, push to neighbors array (init if necessary)
  AdjacencyMapNode.prototype.addNode = function(other) {
    if (this.count === 0) this.neighbor = other;
    else {
      if (this.count === 1) {
        this.neighbors = [];
        this.neighbors.push(this.neighbor);

        this.neighbor = null;
      }

      this.neighbors.push(other);
    }

    this.count++;
    other.predcount++;
  }

  AdjacencyMapNode.prototype.removeNode = function(node) {
    var n = null;

    // only one neighbor; get it and null out the current neighbor
    if (this.count === 1) {
      if (this.neighbor === node) {
        n = this.neighbor;
        this.neighbor = null;
        this.count--;
      }
    }
    // multiple neighbors
    else if (this.count > 1) {
      // find neighbor
      var idx = this.neighbors.indexOf(node);

      // if found neighbor, get it and remove it from neighbors array
      if (idx > -1) {
        n = this.neighbors[idx];
        this.neighbors.splice(idx, 1);
        this.count--;

        // if 1 neighbor left, move it to .neighbor and null out neighbors
        if (this.count === 1) {
          this.neighbor = this.neighbors[0];
          this.neighbors = null;
        }
      }
    }

    if (n !== null) n.predcount--;

    return n;
  }

  // get the neighbor node:
  //  if there is one neighbor, return that
  //  if there are multiple neighbors, take the rightmost possible turn
  AdjacencyMapNode.prototype.nextNode = function(prev) {
    if (this.count < 1) {
      return null;
    }
    else {
      var p = null;

      if (this.count === 1) p = this.neighbor;
      else p = this.getRightmostNode(prev);

      var result = p !== null ? this.removeNode(p) : null;

      return result;
    }
  }

  AdjacencyMapNode.prototype.getRightmostNode = function(prev) {
    // traversal might have started at a node with two neighbors without getting
    // there from a previous node; in that case, just pick one of the neighbors
    if (prev === null) return this.neighbors[0];

    var neighbors = this.neighbors;
    var pt = this.pt;
    var prevpt = prev.pt;

    var inDir = prevpt.vectorTo(pt);

    var PI = Math.PI;

    var anglemax = -PI;
    var anglemaxidx = -1;

    var left = MCG.Math.left;

    for (var ni = 0; ni < neighbors.length; ni++) {
      var npt = neighbors[ni].pt;

      var d = pt.vectorTo(npt);
      var angle = inDir.angleTo(d);

      // correct for negative angles
      if (left(prevpt, pt, npt)) angle = -angle;

      if (angle > PI) angle = -PI;

      if (angle >= anglemax) {
        anglemax = angle;
        anglemaxidx = ni;
      }
    }

    var p = anglemaxidx > -1 ? neighbors[anglemaxidx] : null;

    return p;
  }

  return AdjacencyMapNode;

})();
