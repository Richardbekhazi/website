// Street Test - loader.js: the loading screen (R54). index.html calls LOADING.step(k) just before each script tag, so the
// little car moves along the road bar and the message says what is being built. (Adding the scripts from here instead
// made the browser run them ~3x slower, so the normal script tags stay.) Plain script, like every file here.
'use strict';
window.LOADING = (function () {
  // [message, share of the loading time (measured)], one per script tag in index.html, same order
  const STEPS = [
    ['Unfolding the map of Orléans…', 3],          // data/map.js
    ['Raising the hills…', 3],                      // data/terrain.js
    ['Measuring every bump in the road…', 3],       // data/lidar.js
    ['Mixing paint, brick and asphalt…', 3],        // data/textures.js
    ['Starting the 3D engine…', 3],                 // three.min.js
    ['Opening the garage…', 1],                     // GLTFLoader.js
    ['Washing the QX50…', 3],                       // data/car.js
    ['Furnishing your house…', 2],                  // interior.js
    ['Hanging up the sky…', 3],                     // js/core.js
    ['Rolling out the lawns…', 6],                  // js/ground.js
    ['Pouring asphalt and painting lines…', 38],    // js/roads.js
    [() => 'Building ' + ((window.MAP_DATA && MAP_DATA.buildings.length) || 0).toLocaleString() + ' houses and shops…', 11],   // js/buildings.js
    ['Planting stop signs and lamp posts…', 20],    // js/furniture.js
    ['Setting up the swings at Ouellette Park…', 1],// js/parks.js
    ['Painting the parking lots…', 1],              // js/plazas.js
    ['Painting the street names…', 2],              // js/labels.js
    ['Planting the trees…', 3],                     // js/trees.js
    ['Parking your car in the driveway…', 1],       // js/car.js
    ['Turning the key…', 8],                        // js/game.js
    ['Warming up the engine…', 1],                  // js/sound.js
  ];
  const total = STEPS.reduce((s, x) => s + x[1], 0);
  const $ = id => document.getElementById(id);
  let done = 0, broken = false;
  function show(frac, text) {
    const p = Math.round(frac * 100);
    $('loadFill').style.width = p + '%'; $('loadCar').style.left = 'calc(' + p + '% - ' + (p * 0.44) + 'px)'; $('loadPct').textContent = p + '%';
    if (text && !broken) $('loadMsg').textContent = text;
  }
  // a crash inside a game file: say so on the loading screen instead of hanging there
  addEventListener('error', e => { if (!$('loader')) return; broken = true; $('loader').classList.add('error');
    $('loadMsg').textContent = 'Something broke' + (e.filename ? ' in ' + e.filename.split('/').pop() : '') + ': ' + e.message; });
  return {
    step(k) {
      done = STEPS.slice(0, k).reduce((s, x) => s + x[1], 0);
      const t = STEPS[k] && STEPS[k][0]; show(done / total, typeof t === 'function' ? t() : t);
    },
    finish() {   // world built: let the first frames draw, then fade away
      if (broken) return;
      show(1, 'Ready! Have a nice drive.');
      setTimeout(() => { $('loader').classList.add('gone'); setTimeout(() => $('loader') && $('loader').remove(), 700); }, 400);
    },
  };
})();
