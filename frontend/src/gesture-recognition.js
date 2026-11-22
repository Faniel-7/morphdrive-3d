const PALM_IDS = [0, 5, 9, 13, 17];

const FINGERS = [
  { name: 'index', tip: 8, pip: 6, mcp: 5 },
  { name: 'middle', tip: 12, pip: 10, mcp: 9 },
  { name: 'ring', tip: 16, pip: 14, mcp: 13 },
  { name: 'pinky', tip: 20, pip: 18, mcp: 17 }
];

function distance(a, b) {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return Math.hypot(x, y);
}

function palmWidth(points) {
  return Math.max(distance(points[5], points[17]), 0.001);
}

function palmCenter(points) {
  let x = 0;
  let y = 0;

  for (const id of PALM_IDS) {
    x += points[id].x;
    y += points[id].y;
  }

  return { x: x / PALM_IDS.length, y: y / PALM_IDS.length };
}

function measureHand(points) {
  if (!points || points.length !== 21) return null;

  const width = palmWidth(points);
  const wrist = points[0];

  const extended = {};

  for (const finger of FINGERS) {
    const tipDistance = distance(points[finger.tip], wrist);
    const jointDistance = distance(points[finger.pip], wrist);

    extended[finger.name] =
      tipDistance > jointDistance * 1.12 &&
      distance(points[finger.tip], points[finger.pip]) > width * 0.12;
  }

  const thumbExtended =
    distance(points[4], points[2]) > width * 0.48 &&
    distance(points[4], points[5]) > width * 0.35;

  const pinchRatio = distance(points[4], points[8]) / width;

  return {
    center: palmCenter(points),
    width,
    extended,
    thumbExtended,
    pinchRatio
  };
}

function classifyHand(metrics, previousGesture) {
  if (!metrics) return 'NONE';

  const { extended, thumbExtended, pinchRatio } = metrics;

  // Pinch has priority over pointing.
  if (
    pinchRatio < (previousGesture === 'PINCH' ? 0.40 : 0.30)
  ) {
    return 'PINCH';
  }

  const index = extended.index;
  const middle = extended.middle;
  const ring = extended.ring;
  const pinky = extended.pinky;

  if (index && middle && !ring && !pinky) {
    return 'PEACE';
  }

  if (index && !middle && !ring && !pinky) {
    return 'POINT';
  }

  if (!index && !middle && !ring && !pinky && thumbExtended) {
    return 'THUMBS_UP';
  }

  if (!index && !middle && !ring && !pinky && !thumbExtended) {
    return 'FIST';
  }

  if (index && middle && ring && pinky) {
    return 'OPEN_PALM';
  }

  return 'UNKNOWN';
}

export function createGestureRecognizer({
  holdDuration = 300
} = {}) {
  let lastFrameTimestamp = -1;
  let previousGestures = new Map();
  let candidates = new Map();
  let candidateSince = new Map();
  let stableGestures = new Map();
  let previousZoomDistance = null;

  function update(frame) {
    if (!frame || frame.timestamp === lastFrameTimestamp) {
      return null;
    }

    lastFrameTimestamp = frame.timestamp;

    const hands = frame.hands;
    const current = new Map();

    for (const [side, landmarks] of hands) {
      const metrics = measureHand(landmarks);

      if (!metrics) continue;

      const gesture = classifyHand(
        metrics,
        stableGestures.get(side)
      );

      current.set(side, { gesture, metrics });
    }

    const results = {};

    for (const [side, result] of current) {
      const gesture = result.gesture;
      const previousCandidate = candidates.get(side);

      if (previousCandidate !== gesture) {
        candidates.set(side, gesture);
        candidateSince.set(side, frame.timestamp);
      }

      const heldFor =
        frame.timestamp - (candidateSince.get(side) ?? frame.timestamp);

      if (heldFor >= holdDuration) {
        stableGestures.set(side, gesture);
      }

      results[side] = {
        gesture,
        stableGesture: stableGestures.get(side) || 'NONE',
        confidence:
          gesture === 'UNKNOWN' ? 0 : 1,
        heldFor,
        pinchRatio: result.metrics.pinchRatio
      };
    }

    // Remove stale identities immediately.
    for (const side of [...candidates.keys()]) {
      if (!current.has(side)) {
        candidates.delete(side);
        candidateSince.delete(side);
        stableGestures.delete(side);
      }
    }

    // Two-hand zoom uses the distance between palm centers.
    let zoom = null;

    if (current.has('Left') && current.has('Right')) {
      const left = current.get('Left').metrics.center;
      const right = current.get('Right').metrics.center;

      const separation = Math.hypot(
        left.x - right.x,
        left.y - right.y
      );

      if (previousZoomDistance !== null) {
        const change = separation - previousZoomDistance;

        if (Math.abs(change) > 0.006) {
          zoom = {
            direction: change > 0 ? 'IN' : 'OUT',
            change: Math.abs(change)
          };
        }
      }

      previousZoomDistance = separation;
    } else {
      previousZoomDistance = null;
    }

    previousGestures = new Map(
      [...current].map(([side, value]) => [side, value.gesture])
    );

    return {
      timestamp: frame.timestamp,
      hands: results,
      zoom
    };
  }

  function reset() {
    lastFrameTimestamp = -1;
    previousGestures.clear();
    candidates.clear();
    candidateSince.clear();
    stableGestures.clear();
    previousZoomDistance = null;
  }

  return { update, reset };
}
