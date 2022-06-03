function SSHalfedge(node) {
  this.id = -1;
  this.node = node;
  this.next = null;
  this.twin = null;
}

SSHalfedge.prototype.prev = function() {
  var twin = this.twin;

  while (twin.next != this) twin = twin.next.twin;

  return twin;
}

SSHalfedge.prototype.nstart = function() {
  return this.node;
}

SSHalfedge.prototype.nend = function() {
  return this.next.node;
}

SSHalfedge.prototype.rotated = function() {
  return this.twin.next;
}

// true if given value L is between the endpoint offset "height"; excludes the
// upper bound and assumes we're only considering "uphill" halfedges
SSHalfedge.prototype.aliveAt = function(L) {
  var sL = this.nstart().L;
  var eL = this.nend().L;

  return sL <= L && eL > L;
}

// true if the "height" at the end is greater than that at the start
SSHalfedge.prototype.uphill = function() {
  return this.nstart().L < this.nend().L;
}

// returns the point along the halfedge that has the given "height"
SSHalfedge.prototype.interpolate = function(L) {
  var s = this.nstart();
  var e = this.nend();

  var d = e.L - s.L;
  if (d == 0) return s.v;

  // interpolation parameter
  var t = (L - s.L) / d;

  // return s*(1-t) + e*t
  return s.v.clone().multiplyScalar(1-t).add(e.v.clone().multiplyScalar(t));
}

function SSHalfedgeFactory() {
  this.id = 0;
  this.halfedges = [];
}

SSHalfedgeFactory.prototype.create = function(node) {
  var halfedge = new SSHalfedge(node);

  this.halfedges.push(halfedge);
  halfedge.id = this.id++;

  return halfedge;
}



function SSNode(v, L) {
  this.id = -1;
  // vertex
  this.v = v;
  // one of the 1+ halfedges starting at this node
  this.halfedge = null;
  // true if reflex contour vertex
  this.reflex = false;
  // the "time" at which this node was formed
  this.L = L !== undefined ? L : 0;
}

SSNode.prototype.isolated = function() {
  return this.halfedge == null;
}

SSNode.prototype.terminal = function() {
  return this.halfedge.twin.next == this.halfedge;
}

SSNode.prototype.setReflex = function(reflex) {
  this.reflex = reflex;
}

function SSNodeFactory() {
  this.id = 0;
  this.nodes = [];
}

SSNodeFactory.prototype.create = function(v, L) {
  var node = new SSNode(v, L);

  this.nodes.push(node);
  node.id = this.id++;

  return node;
}



function SSConnector(nfactory, hefactory) {
  this.nfactory = nfactory;
  this.hefactory = hefactory;
}

SSConnector.prototype.connectNodeToNode = function(nsource, ntarget) {
  var st = this.hefactory.create(nsource);
  var ts = this.hefactory.create(ntarget);

  // the halfedge listed on the node is arbitrary, so set it here to make sure
  nsource.halfedge = st;
  ntarget.halfedge = ts;

  st.twin = ts;
  st.next = ts;
  ts.twin = st;
  ts.next = st;

  return ts;
}

// connect the vertex node starting at the source halfedge to the given
// isolated node
SSConnector.prototype.connectHalfedgeToNode = function(hesource, ntarget) {
  if (!ntarget.isolated()) return null;

  var nsource = hesource.node;

  var hesourceIn = hesource.prev();
  var hesourceOut = hesource;

  // create the connecting halfedges
  var hetargetsource = this.connectNodeToNode(nsource, ntarget);
  var hesourcetarget = hetargetsource.twin;

  // link the halfedges correctly
  hesourceIn.next = hesourcetarget;
  hetargetsource.next = hesourceOut;

  return hetargetsource;
}

// connect the vertex node starting at the source halfedge to the vertex node
// starting at the target halfedge while preserving orientation;
// this is distinct from .connectHalfedgeToNode because we don't necessarily
// know which of the incoming/outgoing halfedge pairs incident on the target
// node should be connected
SSConnector.prototype.connectHalfedgeToHalfedge = function(hesource, hetarget) {
  var nsource = hesource.node;
  var ntarget = hetarget.node;

  var hesourceIn = hesource.prev();
  var hesourceOut = hesource;

  var hetargetIn = hetarget.prev();
  var hetargetOut = hetarget;

  // create the connecting halfedges
  var hetargetsource = this.connectNodeToNode(nsource, ntarget);
  var hesourcetarget = hetargetsource.twin;

  // link the halfedges correctly

  hesourceIn.next = hesourcetarget;
  hesourcetarget.next = hetargetOut;

  hetargetIn.next = hetargetsource;
  hetargetsource.next = hesourceOut;

  return hetargetsource;
}



// represents a bidirectional edge coincident with a particular halfedge that's
// interior to the polygon (i.e., regardless of winding, polygon interior is on
// the left)
// helper class meant to make edge-related operators clearer
function SSEdge(he) {
  this.id = -1;

  this.he = he;

  var start = he.nstart().v;
  var end = he.nend().v;

  this.start = start;
  this.end = end;

  this.forward = end.clone().sub(start).normalize();
  this.backward = this.forward.clone().negate();

  // set of LAV node IDs for nodes that have this edge as their forward edge
  this.lnodes = new Set();
}

// register a LAV node that has this edge as its forward edge
SSEdge.prototype.addNode = function(lnode) {
  this.lnodes.add(lnode.id);
}

// unregister a LAV node that no longer has this edge as its forward edge
SSEdge.prototype.removeNode = function(lnode) {
  this.lnodes.delete(lnode.id);
}

SSEdge.prototype.replaceNode = function(lnodeOld, lnodeNew) {
  this.removeNode(lnodeOld);
  this.addNode(lnodeNew);
}

SSEdge.prototype.midpoint = function() {
  return this.start.clone().add(this.end).divideScalar(2);
}

function SSEdgeFactory() {
  this.id = 0;
}

SSEdgeFactory.prototype.create = function(he) {
  var edge = new SSEdge(he);

  edge.id = this.id++;

  return edge;
}



// represents a node in a circular, double-linked list of active vertices
// params:
//  node: the skeleton node to which this LAV node is attached
//  isolated: normally, a LAV is contained inside a CCW loop of halfedges,
//    such that the loop is closed and some/all of its nodes lie on the skeleton
//    vertex nodes; however, in the case of a typical split event (see Felkel),
//    the LAV node formed to the "left" of the intersection doesn't have a CCW
//    halfedge that starts on its corresponding skeleton node and whose
//    following skeleton nodes are also in the "left" LAV - we still have a
//    halfedge, but it leads into the "right" LAV.
//    => isolated is set to true in this case; when connecting to this LAV node,
//    we'll use this.he.twin.next instead this.he, which will get us the
//    halfedge, if any, that's closer counterclockwise to the "left" LAV than
//    the original halfedge emanating from the skeleton node at the intersection
function SSLAVNode(node, isolated) {
  this.id = -1;

  // skeleton node
  this.node = node;

  // skeleton halfedge that starts at this vertex
  this.he = node.halfedge;
  // for ease of access
  this.v = node.v;
  this.L = node.L;
  this.reflex = node.reflex;

  this.isolated = isolated === true;

  // prev/next nodes in lav
  this.prev = null;
  this.next = null;

  // flag - true means that the vert will not take part in further events
  this.processed = false;

  // forward and backward edges
  this.ef = null;
  this.eb = null;

  // normalized bisecting vector
  this.bisector = null;
}

SSLAVNode.prototype.setProcessed = function() {
  // unlink this LAV node's edge from this node
  if (this.ef) this.ef.removeNode(this);
  // set flag
  this.processed = true;
}

SSLAVNode.prototype.setEdgeForward = function(edge) {
  // unlink the current LAV node from this edge
  if (this.ef) this.ef.removeNode(this);
  // link this LAV node to the edge
  edge.addNode(this);
  // set edge
  this.ef = edge;
}

SSLAVNode.prototype.setEdgeBackward = function(edge) {
  // set backward edge
  this.eb = edge;
}

// connect the skeleton node at this LAV node to that at the target LAV node and
// sets the target's halfedge to the resulting halfedge; the halfedge returned
// by the connector goes in the opposite direction, so ensure that the halfedge
// winds CCW around the narrowed subpolygon by calling this in the right
// source-target order;
// e.g., if we have an edge event at LAV nodes A and B (A CW from B), we first
// make skeleton node I at the intersection, put a new LAV node there, then
// connect A to I, then B to I
SSLAVNode.prototype.connect = function(target, connector) {
  // see the description of the .isolated parameter in SSLAVNode constructor
  var heSource = this.isolated ? this.he.twin.next : this.he;

  if (!target.he) {
    target.he = connector.connectHalfedgeToNode(heSource, target.node);
  }
  else {
    var heTarget = target.isolated ? target.he.twin.next : target.he;

    target.he = connector.connectHalfedgeToHalfedge(heSource, heTarget);
  }

  this.isolated = false;
  target.isolated = false;
}

function SSLAVNodeFactory() {
  this.id = 0;
  this.lnodes = [];
}

SSLAVNodeFactory.prototype.create = function(node, isolated) {
  var lnode = new SSLAVNode(node, isolated);

  this.lnodes.push(lnode);
  lnode.id = this.id++;

  return lnode;
}



// basically an enum we'll use to bitmask
var SSEventTypes = {
  noEvent: 0,
  edgeEvent: 1,
  splitEvent: 2,
  startSplitEvent: 4,
  endSplitEvent: 8
}

function SSEvent(lnode) {
  this.type = SSEventTypes.noEvent;

  this.lnode = lnode;

  // intersection point (edge and split events); null if no intersection
  this.intersection = null;

  // distance from event point to all edges involved in the event
  this.L = Infinity;
}

function SSEdgeEvent(lnode) {
  SSEvent.call(this, lnode);

  this.type = SSEventTypes.edgeEvent;

  // both nodes are set if the intersection with both occurs at the same time;
  // one is set if that one occurs closer;
  // neither is set if no intersection, in which case L is Infinity
  this.prevNode = null;
  this.nextNode = null;
}

function SSSplitEvent(lnode) {
  SSEvent.call(this, lnode);

  this.type = SSEventTypes.splitEvent;

  // the bidirectional edge that's split in this event
  this.edge = null;
}

function SSNoEvent() {
  SSEvent.call(this, null);
}

// straight skeleton uses a halfedge data structure; initialize from a polygon
// with holes so that initial halfedges wind CCW around interior of every
// contour and CW around the exterior of every contour;
// poly is assumed a closed, simple CCW contour with holes
//
// this implementation is based on Petr Felkel's paper with the addition of
// special "start" and "end" split events, in which a split event falls exactly
// on one/both of the split edge's bisectors (CGAL refers to these as "pseudo
// split events", IIRC)
function StraightSkeleton(poly) {
  var axis = poly.axis;
  var epsilon = poly.epsilon !== undefined ? poly.epsilon : 0.0000001;

  var contours = [poly].concat(poly.holes);

  if (false) {
    for (var i=0; i<contours.length; i++) {
      var contour = contours[i];
      var c = contour.vertex;
      var o = 0;
      do {
        var vv = c.v.clone();
        var vvn = c.next.v.clone();
        vv[axis]+=o;
        vvn[axis]+=o;
        debug.line(vv, vvn);
        //o+=0.01;
        c = c.next;
      } while (c!=contour.vertex);
    }
    debug.lines(1);
    //console.log("count:", poly.count);
  }

  this.axis = axis;
  this.ah = poly.ah;
  this.av = poly.av;
  this.epsilon = epsilon;
  this.count = poly.count;

  // used for optimization
  this.hasHoles = poly.holes.length > 0;

  this.nfactory = new SSNodeFactory();
  this.hefactory = new SSHalfedgeFactory();
  this.connector = new SSConnector(this.nfactory, this.hefactory);
  this.lfactory = new SSLAVNodeFactory();
  this.efactory = new SSEdgeFactory();

  // array of halfedges, one per separate contour
  this.entryHalfedges = [];

  // all halfedges in the skeleton
  this.halfedges = this.hefactory.halfedges;

  this.makePQ();

  this.buildContour(poly);

  this.buildInterior();
}

StraightSkeleton.prototype.makePQ = function() {
  // pq retrieves smallest-L node first
  var pqComparator = function (a, b) { return a.L - b.L; }

  this.pq = new PriorityQueue({
    comparator: pqComparator,
    strategy: PriorityQueue.BHeapStrategy
  });
}

StraightSkeleton.prototype.queueEvent = function(event) {
  if (event.type != SSEventTypes.noEvent) this.pq.queue(event);
}

// make the contour nodes + halfedges
StraightSkeleton.prototype.buildContour = function(poly) {
  var nfactory = this.nfactory;
  var connector = this.connector;

  var nodes = nfactory.nodes;

  // polygon and its holes in one array
  var contours = [poly].concat(poly.holes);

  // make vertex nodes and halfedges for every vert/edge in every contour
  for (var c = 0; c < contours.length; c++) {
    var cnode = contours[c].vertex;

    var count = 0;
    var nstart = null;
    var heprev = null;

    var curr = cnode;
    do {
      var v = curr.v;

      var n = nfactory.create(v, 0);
      n.setReflex(curr.reflex);

      if (count == 0) nstart = n;
      else {
        var he;

        if (count == 1) he = connector.connectNodeToNode(nstart, n);
        else he = connector.connectHalfedgeToNode(heprev, n);

        heprev = he;

        he.contour = true;
        he.twin.contour = true;
      }

      count++;

      curr = curr.next;
    } while (curr != cnode);

    // close the gap between last and first nodes
    heprev = connector.connectHalfedgeToHalfedge(heprev, nstart.halfedge);

    this.entryHalfedges.push(heprev.twin);
  }
}

// process events and fill out the internal nodes + halfedges
StraightSkeleton.prototype.buildInterior = function() {
  var axis = this.axis;
  var epsilon = this.epsilon;

  var pq = this.pq;

  var nfactory = this.nfactory;
  var hefactory = this.hefactory;
  var connector = this.connector;
  var lfactory = this.lfactory;

  var contourNodeCount = nfactory.nodes.length; // todo: remove

  var lnodes = lfactory.lnodes;

  var slav = this.makeslav();

  this.computeInitialEvents(slav);

  var iterationLimit = this.count * this.count * 2;

  var ct = 0;
  var lim = 81300000;
  var t = true, f = false;
  var limitIterations = f;
  var skeletonShiftDistance = 0;
  var iterativelyShiftSkeleton = f;
  var validate = f;

  var logEvent = f;

  var prevL = 0;

  while (pq.length > 0) {
    ct++;
    if (ct > iterationLimit) return;
    if (limitIterations && ct > lim) break;

    var event = pq.dequeue();

    if (less(event.L, prevL, epsilon)) {
      if (logEvent) console.log(ct, "EVENT IN WRONG ORDER", prevL, event.L);
    }
    prevL = Math.max(prevL, event.L);

    var lnodeV = event.lnode;

    if (validate) {
      var validated = true;
      validated = validateEdges(this.edges, lnodes);
      if (!validated) {
        console.log(ct);
        break;
      }

      validated = validateLAV(lnodeV);
      if (!validated) {
        console.log(ct);
        break;
      }
    }

    var eventType = event.type;

    if (eventType == SSEventTypes.noEvent) continue;

    var vI = event.intersection;

    if (eventType & SSEventTypes.edgeEvent) {
      if (logEvent) console.log(ct, "edge event", event.L);
      // in edge event, V's bisector intersects one/both of its neighbors'
      // bisectors resulting in the collapse of the edge between one/both pairs
      // of bisectors to an internal straight skeleton node

      // original prev/next nodes that caused the intersection
      var lnodeP = event.prevNode;
      var lnodeN = event.nextNode;

      // if V crosses both P and N at the same point, the event is degenerate;
      // if degenerate, we'll handle just P and V, then enqueue the V-N half of
      // the event and handle that later
      var degenerate = !!lnodeP && !!lnodeN;

      // set the two nodes such that B is CCW from A
      var lnodeA, lnodeB;

      // select P and V if available, else select V and N; A is CW from B
      if (lnodeP) {
        lnodeA = lnodeP;
        lnodeB = lnodeV;
      }
      else {
        lnodeA = lnodeV;
        lnodeB = lnodeN;
      }

      var procA = lnodeA.processed;
      var procB = lnodeB.processed;

      if (ct >= lim) {
        debugPt(lnodeA.v, 0.1, true);
        debugPt(lnodeB.v, 0.2, true);
        debugPt(vI, 0.3, true);
        debugLAV(lnodeB, 4, 1000, true, 0, false);

        var ef = lnodeB.ef;
        var eb = lnodeA.eb;
        var down = new THREE.Vector3();
        down[axis] = -1;
        var L = event.L;
        var efd = ef.end.clone().sub(ef.start).cross(down).normalize();
        var ebd = eb.end.clone().sub(eb.start).cross(down).normalize();
        var efp = ef.midpoint().addScaledVector(efd, L);
        var ebp = eb.midpoint().addScaledVector(ebd, L);
        if (true) {
          debugRay(lnodeB.prev.v, lnodeB.prev.bisector, 0, 0, 1);
          debugRay(lnodeB.v, lnodeB.bisector, 0, 0, 1);
          debugRay(lnodeB.next.v, lnodeB.next.bisector, 0, 0, 1);
          break;
        }
        if (false) {
          debugRay(efp, ef.forward, 0, 0, 1);
          debugRay(efp, ef.backward, 0, 0, 1);
          debugRay(ebp, eb.forward, 0, 0, 1);
          debugRay(ebp, eb.backward, 0, 0, 1);
          debugLn(ef.start, ef.end, 0.05, 0);
          debugLn(eb.start, eb.end, 0.05, 0);
        }
      }

      if (logEvent && (procA && procB)) console.log("DISCARD");
      // both nodes already processed, so no new halfedges to draw
      if (procA && procB) {
        // if V intersects both P and N in the same location but P and V are
        // already processed, V and N might still intersect; remove P from the
        // event and queue it back as an ordinary two-bisector edge event
        if (degenerate) {
          event.prevNode = null;
          this.queueEvent(event);
        }
        continue;
      }

      //if (ct>=lim) break;
      if (ct>=lim && !lnodeA.processed && lnodeA.next.next.next == lnodeA) {
        debugRay(lnodeA.v, lnodeA.bisector, 0.1, 0, 0.1, true);
        debugRay(lnodeA.next.v, lnodeA.next.bisector, 0.1, 0, 0.1, true);
      }

      if (this.handlePeak(lnodeA, vI, event.L)) continue;
      if (this.handlePeak(lnodeB, vI, event.L)) continue;

      // the LAV node at the bisector intersection
      var lnodeI = null;

      // if A is processed and B is not processed and the intersection point
      // matches the L for the current event
      if (procA) {
        if (logEvent) console.log("A PROCESSED");

        lnodeI = lnodeB.prev;

        if (less(lnodeI.L, event.L, epsilon)) {
          if (logEvent) console.log("DISCARD");

          var newEvent = this.computeEdgeEvent(lnodeB);
          this.queueEvent(newEvent);
          continue;
        }

        // connect
        lnodeI.next = lnodeB.next;
        lnodeB.next.prev = lnodeI;

        lnodeI.setEdgeForward(lnodeB.ef);
        lnodeB.setProcessed();

        lnodeB.connect(lnodeI, connector);
      }
      // if A is not processed and B is processed
      else if (procB) {
        if (logEvent) console.log("B PROCESSED");

        lnodeI = lnodeA.next;

        if (less(lnodeI.L, event.L, epsilon)) {
          if (logEvent) console.log("DISCARD");

          var newEvent = this.computeEdgeEvent(lnodeA);
          this.queueEvent(newEvent);
          continue;
        }

        // connect
        lnodeI.prev = lnodeA.prev;
        lnodeA.prev.next = lnodeI;

        lnodeI.setEdgeBackward(lnodeA.eb);
        lnodeA.setProcessed();

        lnodeI.connect(lnodeA, connector);
      }
      else {
        if (!greater(event.L, lnodeA.L, epsilon) || !greater(event.L, lnodeB.L, epsilon)) {
          if (logEvent) console.log("DISCARD", lnodeA.L, lnodeB.L);

          continue;
        }

        // new node at intersection
        var nI = nfactory.create(vI, event.L);

        // make a new LAV node at the intersection
        lnodeI = lfactory.create(nI);

        // link A to I
        lnodeA.connect(lnodeI, connector);
        lnodeA.setProcessed();

        // link B to I
        lnodeB.connect(lnodeI, connector);
        lnodeB.setProcessed();

        var newprev = lnodeA.prev;
        var newnext = lnodeB.next;
        newprev.next = lnodeI;
        lnodeI.prev = newprev;
        newnext.prev = lnodeI;
        lnodeI.next = newnext;

        lnodeI.setEdgeForward(lnodeB.ef);
        lnodeI.setEdgeBackward(lnodeA.eb);
      }

      this.computeBisector(lnodeI);

      //if (logEvent) debugPt(lnodeI.v, -0.5, true, 1);

      if (degenerate) {
        event.prevNode = null;
        this.queueEvent(event);
      }
      else {
        var eventI = this.computeEdgeEvent(lnodeI);
        this.queueEvent(eventI);

        if (ct >= lim) {
          if (eventI.prevNode) debugLn(eventI.intersection, eventI.prevNode.v);
          if (eventI.nextNode) debugLn(eventI.intersection, eventI.nextNode.v);
          if (eventI.intersection) debugLn(eventI.intersection, lnodeI.v);
        }
      }

      if (ct >= lim) {
        //debugLAV(lnodeI, 2, 250, true, 0.0);
      }
    }

    else if (eventType & SSEventTypes.splitEvent) {
      if (logEvent) {
        var logstring = "split event";
        if (eventType & SSEventTypes.startSplitEvent) logstring += " START";
        if (eventType & SSEventTypes.endSplitEvent) logstring += " END";
        console.log(ct, logstring, event.L);
      }
      // in split event, V's bisector causes a given A-B edge to split.
      // the new node structure looks like this:
      //
      // B---A
      //  *?*
      //   I
      //   |
      //   V
      //  / \
      // P   N
      // where the original LAV went P -> V -> N -> ... -> A -> B -> ... -> P; we
      // create an I hanging off the V, splitting the LAV on either side of I.
      // In the following:
      // "right" denotes the ... -> P -> I -> B -> ... sequence and
      // "left" denotes the ... -> A -> I -> N -> ... sequence
      // except for the special cases where I is directly on the bisector of
      // A, B, or both (referred to as start split and end split, respectively)

      // the edge that's split
      var edge = event.edge;

      if (ct >= lim) {
        debugPt(lnodeV.v, 0.05, true);
        debugPt(vI, 0.1, true);
        debugLn(edge.start, edge.end, 0.05, 0);
      }

      if (logEvent && lnodeV.processed) console.log("DISCARD");
      if (lnodeV.processed) continue;

      if (ct >= lim) {
        debugLAV(lnodeV, 5, 250, true, 0, false);
      }

      // true if intersection is on the start/end bisectors, respectively
      var startSplit = !!(eventType & SSEventTypes.startSplitEvent);
      var endSplit = !!(eventType & SSEventTypes.endSplitEvent);

      // start LAV node of the edge that's split
      var lnodeA = null;

      // see which LAV nodes F are associated with the edge - choose one of
      // these to split

      for (var lidx of edge.lnodes) {
        var lnodeF = lnodes[lidx];
        var lnodeS = lnodeF.next;
        var vF = lnodeF.v;
        var vS = lnodeS.v;
        var vFoffset = vF.clone().add(lnodeF.bisector);
        var vSoffset = vS.clone().add(lnodeS.bisector);
        if (ct>=lim) {
          debugRay(vF, lnodeF.bisector, 0, 0, 1);
          debugRay(vS, lnodeS.bisector, 0, 0, 1);
        }

        // intersection must be within the sweep area between F and S
        if (left(vF, vFoffset, vI, axis, epsilon)) continue;
        if (left(vSoffset, vS, vI, axis, epsilon)) continue;

        lnodeA = lnodeF;
        break;
      }

      if (!lnodeA) {
        if (logEvent) console.log(ct, "FAILED TO FIND SPLIT EDGE START", edge.lnodes);
        //debugPt(lnodeV.v, 0.5, 0);
        //debugLn(edge.start, edge.end, 0.5, 0);
        continue;
      }

      var lnodeB = lnodeA.next;

      if (logEvent && (lnodeA.processed || lnodeB.processed)) console.log("UPDATE: DISCARD");
      if (lnodeA.processed || lnodeB.processed) continue;

      if (ct>=lim) {
        debugPt(lnodeA.v, -0.05, true);
        debugPt(lnodeB.v, -0.05, true);
        debugLAV(lnodeA, 2, 1100, true, 0, false, 0.01);
      }

      // V's predecessor and successor
      var lnodeP = lnodeV.prev;
      var lnodeN = lnodeV.next;

      // put a new skeleton vertex node at split point
      var nI = nfactory.create(vI, event.L);

      // halfedge from V
      //var heV = lnodeV.he;

      // split the LAV in two by creating two new LAV nodes at the intersection
      // and linking their neighbors and the split edge's endpoints accordingly

      // new LAV node on the A-N side of I (right node is always at the start
      // of the IV halfedge)
      var lnodeRight = lfactory.create(nI);

      // connect V to I
      lnodeV.connect(lnodeRight, connector);
      //var heIV = connector.connectHalfedgeToNode(heV, nI);
      lnodeV.setProcessed();

      // new LAV node on the P-B side of I; pass the isolated param as true to
      // ensure correct halfedge links
      var lnodeLeft = lfactory.create(nI, true);

      // if intersection is on A or B bisector, link I to one or both and make
      // the left LAV node accordingly
      if (startSplit) lnodeRight.connect(lnodeA, connector);
      if (endSplit) lnodeB.connect(lnodeLeft, connector);

      // link the new LAV nodes accounting for the possibility that A and/or B
      // were eliminated by an exact bisector intersection

      // I's neighbors depend on whether a start/end split occurred:

      // prev node on A-I-N side
      var lnodeRPrev = startSplit ? lnodeA.prev : lnodeA;
      // next node on P-I-B side
      var lnodeLNext = endSplit ? lnodeB.next : lnodeB;

      // link A-N side of I
      lnodeRPrev.next = lnodeRight;
      lnodeRight.prev = lnodeRPrev;
      lnodeN.prev = lnodeRight;
      lnodeRight.next = lnodeN;

      // link P-B side of I
      lnodeP.next = lnodeLeft;
      lnodeLeft.prev = lnodeP;
      lnodeLNext.prev = lnodeLeft;
      lnodeLeft.next = lnodeLNext;

      // A and/or B can be eliminated by start/end split
      if (startSplit) lnodeA.setProcessed();
      if (endSplit) lnodeB.setProcessed();

      lnodeRight.setEdgeForward(lnodeV.ef);
      lnodeRight.setEdgeBackward(startSplit ? lnodeA.eb : lnodeA.ef)
      lnodeLeft.setEdgeForward(endSplit ? lnodeB.ef : lnodeB.eb);
      lnodeLeft.setEdgeBackward(lnodeP.ef);

      this.computeReflex(lnodeRight);
      this.computeBisector(lnodeRight);
      this.computeReflex(lnodeLeft);
      this.computeBisector(lnodeLeft);

      // final processing:
      // 1. if V is adjacent to A/B, link A/B to the right/left node, resp.;
      // 2. else, calculate bisectors and potential new events

      //if (logEvent) debugPt(vI, -0.5, true, 3);

      // A-N side of I
      if (lnodeRight.next.next == lnodeRight) {
        lnodeRight.connect(lnodeRight.next, connector);

        lnodeRight.setProcessed();
        lnodeRight.next.setProcessed();
        if (logEvent) console.log("right split empty");
      }
      else {
        var edgeEventRight = this.computeEdgeEvent(lnodeRight);
        this.queueEvent(edgeEventRight);
        //var splitEventRight = this.computeSplitEvent(lnodeRight);
        //this.queueEvent(splitEventRight);

        if (ct >= lim) {
          //debugLAV(lnodeLeft, 1, 250, true, 0);
        }
      }

      // P-B side of I
      if (lnodeLeft.next.next == lnodeLeft) {
        lnodeLeft.next.connect(lnodeLeft, connector);

        lnodeLeft.setProcessed();
        lnodeLeft.next.setProcessed();
        if (logEvent) console.log("left split empty");
      }
      else {
        var edgeEventLeft = this.computeEdgeEvent(lnodeLeft);
        this.queueEvent(edgeEventLeft);
        //var splitEventLeft = this.computeSplitEvent(lnodeLeft);
        //this.queueEvent(splitEventLeft);

        if (ct >= lim) {
          //debugLAV(lnodeLeft, 0, 250, true, 0);
        }
      }
    }
  }

  //debugSkeleton();
  //debugFaces(this.hefactory.halfedges);

  //debugRoof(this.hefactory.halfedges);

  var limoffset = 0;
  var offset = 0;
  var doffset = .5;
  while (offset < limoffset) {
    var curves = this.generateOffsetCurve(doffset*(++offset));

    if (curves.length == 0) break;

    for (var i=0; i<curves.length; i++) {
      var curve = curves[i];
      for (var j=0; j<curve.length; j++) {
        debugLn(curve[j], curve[(j+1+curve.length)%curve.length], 0, (offset%5==0)?6:1);
      }
    }
  }

  function debugSkeleton() {
    var offset = skeletonShiftDistance;
    var nodes = nfactory.nodes;
    for (var i=contourNodeCount; i<nodes.length; i++) {
      var node = nodes[i];

      var he = node.halfedge;
      do {
        if (!he) break;
        var vs = node.v.clone();
        var ve = he.nend().v.clone();
        vs[axis] += offset;
        ve[axis] += offset;
        debug.line(vs, ve);

        he = he.rotated();
      } while (he != node.halfedge);
      if (iterativelyShiftSkeleton) offset += -0.1;
    }
    debug.lines();
  }

  function validateFaces(halfedges) {
    var seen = new Array(halfedges.length);
    seen.fill(false);

    var nseen = new Set();

    var valid = true;

    for (var h=0; h<halfedges.length; h++) {
      var hestart = halfedges[h];

      if (seen[h]) continue;

      var he = hestart;
      do {
        if (nseen.has(he.nstart().id)) {
          valid = false;
          console.log("LOOP DETECTED");
        }

        nseen.add(he.nstart().id);
        seen[he.id] = true;

        he = he.next;
      } while (he != hestart);
    }

    return valid;
  }

  function debugFaces(halfedges) {
    var seen = new Array(halfedges.length);
    seen.fill(false);

    for (var h=0; h<halfedges.length; h++) {
      var hestart = halfedges[h];

      if (seen[h]) continue;

      var level = h/2 + 1;

      debugFace(hestart, seen, level, 0);
    }
  }

  function debugFace(hestart, seen, level, doff) {
    if (doff===undefined) doff = 0.01;

    var nseen = new Set();

    var he = hestart;
    var off = 0;
    do {
      if (seen) seen[he.id] = true;

      if (nseen.has(he.nstart().id)) console.log("LOOP DETECTED");
      nseen.add(he.nstart().id);

      var vs = he.nstart().v.clone();
      var ve = he.nend().v.clone();
      vs[axis] += level + off;
      ve[axis] += level + off;
      debugLn(vs, ve, 0, 5, true);

      off += doff;

      he = he.next;
    } while (he != hestart);
  }

  function debugRoof(halfedges) {
    var seen = new Array(halfedges.length);
    seen.fill(false);

    for (var h=0; h<halfedges.length; h++) {
      var hestart = halfedges[h];

      if (seen[h]) continue;

      var he = hestart;
      do {
        seen[he.id] = true;
        var vs = he.nstart().v.clone();
        var ve = he.nend().v.clone();
        vs[axis] += he.nstart().L;
        ve[axis] += he.nend().L;
        debugLn(vs, ve, 0, 5);

        he = he.next;
      } while (he != hestart);
    }
  }

  function validateEdges(edges, lnodes) {
    var valid = true;

    for (var e=0; e<edges.length; e++) {
      var edge = edges[e];
      for (var lidx of edge.lnodes) {
        var lnode = lnodes[lidx];
        if (lnode.ef!=edge) {
          valid = false;
          console.log("WRONG EDGE ON NODE", lnode, edge);
          debugLn(lnode.v, lnode.next.v, 0.2, 1);
          debugLn(edge.start, edge.end, 0.4, 2);
        }
      }
    }

    for (var l=0; l<lnodes.length; l++) {
      var lnode = lnodes[l];
      if (lnode.processed) continue;

      var ef = lnode.ef;
      if (!ef.lnodes.has(lnode.id)) {
        valid = false;
        console.log("NODE NOT PRESENT IN EDGE'S SET", lnode, ef);
        debugLn(lnode.v, lnode.next.v, 0.2, 1, true);
        debugLn(ef.start, ef.end, 0.4, 2);
      }
    }

    return valid;
  }

  function validateLAV(start) {
    var valid = true;
    var seen = new Set();

    if (start.processed) return true;

    var lnode = start;
    do {
      if (seen.has(lnode.id)) {
        console.log("LOOP WITH NODE", lnode.id);
        valid = false;
        break;
      }

      if (lnode.next.prev != lnode) {
        console.log("BRANCH AT NODE", lnode.id);
        valid = false;
        break;
      }

      seen.add(lnode.id);
      lnode = lnode.next;
    } while (lnode != start);

    return valid;
  }

  function debugPt(v, o, includeStart, c) {
    if (o===undefined) o = 0;
    if (c===undefined) c = 0;

    var vcopy = v.clone();
    vcopy[axis] += o;
    debug.point(vcopy);

    if (includeStart) {
      debug.line(v, vcopy);
    }
    debug.lines(c);
  }

  function debugLn(v, w, o, c, dir) {
    if (o===undefined) o = 0;
    if (c===undefined) c = 0;

    var vcopy = v.clone();
    var wcopy = w.clone();
    vcopy[axis] += o;
    wcopy[axis] += o;

    if (dir) debug.line(vcopy, wcopy, 10, true);
    else debug.line(vcopy, wcopy);
    debug.lines(c);
  }

  function debugRay(v, r, o, c, l, dir) {
    var bp = r.clone().setLength(l);
    var vo = v.clone().add(bp);
    debugLn(v, vo, o, c, dir);
  }

  function debugLAV(lnode, c, maxct, bisectors, increment, edges, blength) {
    if (maxct === undefined) maxct = Infinity;
    if (increment === undefined) increment = 0.05;
    if (blength === undefined) blength = 0.05;

    if (lnode.processed) return;

    var dct = 0;

    var o = 0;
    var lv = lnode;
    do {
      c = c===undefined ? 0 : c;
      debugLn(lv.v, lv.next.v, o, c, false);
      //debugPt(lv.v, o-increment, true, c);
      if (bisectors) debugRay(lv.v, lv.bisector, o, c+1, blength);
      if (edges) {
        var efCenter = lv.ef.start.clone().add(lv.ef.end).multiplyScalar(0.5);
        var ebCenter = lv.eb.start.clone().add(lv.eb.end).multiplyScalar(0.5);
        debugLn(lv.v, efCenter, o, c+3, true);
        debugLn(lv.v, ebCenter, o, c+4, true);
      }

      lv = lv.next;
      o += increment;
      if (++dct > maxct) {
        console.log("debugging LAV node", lv.id, "went over the limit", maxct);
        break;
      }
    } while (lv != lnode);
  }

  function debugEdge(edge, c, oo) {
    if (oo===undefined) oo = 0;

    var ddct = 0;
    for (var lx of edge.lnodes) {
      ddct++;
      var lnode = lnodes[lx];
      //debugPt(lnode.v, -0.1*ddct);
      debugLAV(lnode, c, 250, true, oo);
    }
    console.log(ddct);
  }

  return;
}

StraightSkeleton.prototype.generateOffsetCurve = function(L) {
  var halfedges = this.hefactory.halfedges;
  var seen = new Array(halfedges.length);
  var curves = [];

  seen.fill(false);

  for (var h = 0; h < halfedges.length; h++) {
    var hestart = halfedges[h];

    if (seen[h] || !hestart.aliveAt(L) || !hestart.uphill()) continue;

    var curve = [];

    // cycle through faces till we hit the starting halfedge again
    var he = hestart;
    do {
      curve.push(he.interpolate(L));
      seen[he.id] = true;
      seen[he.twin.id] = true;

      // flip to the next polygon
      var henext = he.twin;
      // search for the next halfedge in the polygon that's at the same L
      do {
        henext = henext.prev();
      } while (!henext.aliveAt(L));

      he = henext;
    } while (he != hestart);

    curves.push(curve);
  }

  return curves;
}

StraightSkeleton.prototype.handlePeak = function(lnode, vI, L) {
  if (lnode.processed || lnode.next.next.next != lnode) return false;

  var connector = this.connector;

  var lnodeX = lnode;
  var lnodeY = lnodeX.next;
  var lnodeZ = lnodeY.next;

  var vX = lnodeX.v, vY = lnodeY.v;
  var bX = lnodeX.bisector, bY = lnodeY.bisector;

  // original intersection vertex might not be the actual intersection point,
  // so compute an intersection between two of the LAV nodes; however, in
  // degenerate situations in which the verticess are very close together,
  // computing a new intersection may fail, so fall back to the old vertex
  // if necessary
  var vInew = rayLineIntersection(vX, bX, vY, bY, this.axis, this.epsilon);
  var nI = this.nfactory.create(vInew === null ? vI : vInew, L);

  // create a new LAV node for uniformity in API usage
  var lnodeI = this.lfactory.create(nI);

  lnodeX.connect(lnodeI, connector);
  lnodeY.connect(lnodeI, connector);
  lnodeZ.connect(lnodeI, connector);

  lnodeX.setProcessed();
  lnodeY.setProcessed();
  lnodeZ.setProcessed();
  lnodeI.setProcessed();

  return true;
}

// LAV: list of active vertices (technically, halfedges originating from the
// active vertices), one for each contour
// SLAV: set of LAVs - the current fronts for propagating the skeleton
//
// creates a SLAV, initialized to correspond to the initial contours of the poly
// and its holes, and calculates all the initial events
StraightSkeleton.prototype.makeslav = function() {
  var slav = new Set();

  for (var i=0; i<this.entryHalfedges.length; i++) {
    var hestart = this.entryHalfedges[i];

    var lav = null;
    var lstart = null;

    this.edges = []; // todo: remove

    var he = hestart;
    do {
      // lav node, implicitly signifies vertex at start of given halfedge
      var lnode = this.lfactory.create(he.nstart());
      lnode.he = he;

      if (lav) {
        lnode.prev = lav;
        lav.next = lnode;
      }
      else lstart = lnode;

      lav = lnode;

      // necessary because halfedge is internal to the contour but iterating
      // forward after topology has changed might trap us in a subpolygon of
      // the halfedge data structure
      he = he.twin.prev().twin;
    } while (he != hestart);

    lav.next = lstart;
    lstart.prev = lav;

    var lcurr;

    // calculate forward and backward edges
    lcurr = lav;
    do {
      var edge = this.efactory.create(lcurr.he);
      lcurr.setEdgeForward(edge);
      lcurr.next.setEdgeBackward(edge);
      this.edges.push(edge); // todo: remove

      lcurr = lcurr.next;
    } while (lcurr != lav);

    // set reflex state
    lcurr = lav;
    do {
      this.computeReflex(lcurr);

      lcurr = lcurr.next;
    } while (lcurr != lav);

    // calculate bisectors
    lcurr = lav;
    do {
      this.computeBisector(lcurr);

      lcurr = lcurr.next;
    } while (lcurr != lav);

    slav.add(lav);
  }

  return slav;
}

StraightSkeleton.prototype.computeReflex = function(lnode) {
  var ef = lnode.ef;
  var eb = lnode.eb;
  var cross = crossProductComponent(ef.forward, eb.backward, this.axis);

  lnode.reflex = cross < 0;
}

StraightSkeleton.prototype.computeBisector = function(lnode) {
  var forward = lnode.ef.forward;
  var backward = lnode.eb.backward;
  var bisector = forward.clone().add(backward).normalize();

  if (lnode.reflex) bisector.negate();

  lnode.bisector = bisector;
}

// given a node in the lav, see which of its neighbors' bisectors it intersects
// first (if any)
StraightSkeleton.prototype.computeEdgeEvent = function(lnodeV) {
  var axis = this.axis;
  var epsilon = this.epsilon;

  var v = lnodeV.v;
  var b = lnodeV.bisector;
  var lprev = lnodeV.prev;
  var vprev = lprev.v;
  var bprev = lprev.bisector;
  var lnext = lnodeV.next;
  var vnext = lnext.v;
  var bnext = lnext.bisector;

  var iprev = rayLineIntersection(v, b, vprev, bprev, axis, epsilon);
  var inext = rayLineIntersection(v, b, vnext, bnext, axis, epsilon);

  // 0 if no intersection; 1 if prev closer; 2 if next closer; 1|2==3 if equal
  var intersectionResult = 0;
  if (iprev && inext) {
    // distances from the intersections to v
    var diprev = iprev.distanceTo(v);
    var dinext = inext.distanceTo(v);

    if (equal(diprev, dinext, epsilon)) intersectionResult = 3;
    else if (less(diprev, dinext, epsilon)) intersectionResult = 1;
    else intersectionResult = 2;
  }
  else if (iprev) intersectionResult = 1;
  else if (inext) intersectionResult = 2;

  if (intersectionResult == 0) return new SSNoEvent();

  var event = new SSEdgeEvent(lnodeV);

  // intersection with prev bisector is closer or equal
  if (intersectionResult & 1) event.prevNode = lprev;
  // intersection with next bisector is closer or equal
  if (intersectionResult & 2) event.nextNode = lnext;

  if (intersectionResult & 1) {
    event.intersection = iprev;
    var edge = lnodeV.eb;
    event.L = distanceToLine(iprev, edge.start, edge.end);
  }
  else {
    event.intersection = inext;
    var edge = lnodeV.ef;
    event.L = distanceToLine(inext, edge.start, edge.end);
  }

  if (less(event.L, lnodeV.L, epsilon) ||
    (event.prev && less(event.L, event.prev.L, epsilon)) ||
    (event.next && less(event.L, event.next.L, epsilon))
  ) {
    //console.log("GENERATED EVENT WITH WRONG L", event);
  }

  return event;
}

// calculates the closest split event caused by V's bisector (if V is reflex);
// if no split event, leave it alone
StraightSkeleton.prototype.computeSplitEventSLAV = function(lnode, slav) {
  var result = null;

  for (var lav of slav) {
    var event = this.computeSplitEvent(lnode, lav);
    if (!result || event.L < result.L) result = event;
  }

  return result;
}

StraightSkeleton.prototype.computeSplitEvent = function(lnodeV, lav) {
  if (!lnodeV.reflex) return new SSNoEvent();

  // default is to search in V's own LAV
  if (!lav) lav = lnodeV;

  var v = lnodeV.v;
  var b = lnodeV.bisector;
  var axis = this.axis;
  var epsilon = this.epsilon;

  var splitPoint = null;
  // edge that gets split
  var eventEdge = null;
  var minL = Infinity;
  var splitType = 0;

  var lcurr = lav;
  do {
    // say current lnode is A and its next is B; we're considering the edge
    // between A and B through A and B
    var lnodeA = lcurr;
    var lnodeB = lcurr.next;

    lcurr = lcurr.next;

    // lnodeV's bisector will never split either of its incident edges
    if (lnodeA == lnodeV || lnodeB == lnodeV) continue;

    var ef = lnodeA.ef;
    var bA = lnodeA.bisector;
    var bB = lnodeB.bisector;

    var eAB = ef.forward;
    var vA = ef.start;
    var vB = ef.end;

    // the AB edge must "face" the splitting vertex - B left of VA segment
    if (!leftOn(v, vA, vB, axis, epsilon)) continue;

    // now say the forward and backward edges emanating from V intersect the
    // AB line at points R and S (R is closer); find R, draw its bisector with
    // AB line, see where it intersects V's bisector

    // edges emanating from V - *reverse* forward/backward edges, respectively
    var efnV = lnodeV.ef.backward;
    var ebnV = lnodeV.eb.forward;

    // pick the edge that's least parallel with the testing edge to avoid
    // the more parallel edge
    var fndotAB = Math.abs(efnV.dot(eAB));
    var bndotAB = Math.abs(ebnV.dot(eAB));
    var enV = (fndotAB < bndotAB) ? efnV : ebnV;

    // R is intersection point between the edge from V and the AB line
    var vR = lineLineIntersection(v, enV, vA, eAB, axis, epsilon);

    if (vR === null) continue;

    // vector from R to V
    var eRV = v.clone().sub(vR).normalize();

    // need AB edge pointing from R toward the bisector
    if (left(v, v.clone().add(b), vR, axis)) eAB = ef.backward;

    // calculate bisector (not normalized) of AB line and RV vector
    var bRAB = eRV.add(eAB);

    // potential split event happens here
    var vSplit = rayLineIntersection(v, b, vR, bRAB, axis, epsilon);

    if (vSplit === null) continue;

    // verify that the split event occurs within the area swept out by AB edge

    // A and A+A.bisector support the line that forms A's side of the edge's
    // sweep area; likewise for B
    var vAoffset = vA.clone().add(bA);
    var vBoffset = vB.clone().add(bB);

    // if the split point is coincident with one (or both) of the edge's
    // bisectors, then V's wavefront doesn't split the edge in two but instead
    // meets it at one (or both) of its ends - this is a special case of the
    // split event and has special handling
    var type = 0;
    if (collinear(vA, vAoffset, vSplit, axis, epsilon)) {
      type = type | SSEventTypes.startSplitEvent;
    }
    if (collinear(vB, vBoffset, vSplit, axis, epsilon)) {
      type = type | SSEventTypes.endSplitEvent;
    }

    // check if split point is on the "interior" side of the edge
    if (!left(vA, vB, vSplit, axis, epsilon)) continue;

    // if split point is not already known to be on one of the bisectors,
    // check if it's between the bisectors bounding the edge's sweep area
    if (type == 0) {
      if (left(vA, vAoffset, vSplit, axis, epsilon)) continue;
      if (left(vBoffset, vB, vSplit, axis, epsilon)) continue;
    }

    // valid split point, so see if it's the closest so far
    var L = distanceToLine(vSplit, vA, vB);

    if (L < minL) {
      minL = L;
      splitPoint = vSplit;
      eventEdge = lnodeA.ef;
      splitType = type;
    }
  } while (lcurr != lav);

  if (minL == Infinity) return new SSNoEvent();

  var event = new SSSplitEvent(lnodeV);

  // if the closest split event we found is closer than the edge event already
  // calculated for V, set V's event to split and set the appropriate fields
  if (minL < event.L) {
    event.type |= splitType;
    event.L = minL;
    event.intersection = splitPoint;
    event.edge = eventEdge;
  }

  return event;
}

StraightSkeleton.prototype.computeEvent = function(lnode, slav) {
  var edgeEvent = this.computeEdgeEvent(lnode);
  var splitEvent = this.computeSplitEventSLAV(lnode, slav);

  return edgeEvent.L < splitEvent.L ? edgeEvent : splitEvent;
}

// given a set of LAVs, compute the initial events
StraightSkeleton.prototype.computeInitialEvents = function(slav) {
  var pq = this.pq;

  for (var lav of slav) {
    var lnode = lav;
    do {
      var event = this.computeEvent(lnode, slav);
      this.queueEvent(event);

      lnode = lnode.next;
    } while (lnode != lav);
  }
}
