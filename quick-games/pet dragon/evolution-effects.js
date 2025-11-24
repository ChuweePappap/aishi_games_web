/**
 * Evolution Effects Placeholder
 *
 * This file is dedicated to handling the visual and audio effects
 * that happen when the dragon evolves.
 *
 * You can add particle systems, canvas animations, or complex DOM manipulations here.
 */

function playEvolutionEffect(fromStage, toStage) {
  console.log(`Playing evolution effect: ${fromStage} -> ${toStage}`)

  // Example: Play sound defined in script.js
  if (typeof playSound === 'function') {
    playSound('evolve')
  }

  // Example: Trigger CSS animation on the dragon image
  // The animateDragon function is defined in script.js
  if (typeof animateDragon === 'function') {
    animateDragon('bounce')
  }

  // --- PLACEHOLDER FOR CUSTOM EFFECTS ---

  if (fromStage === 'egg' && toStage === 'baby') {
    const videoEl = document.getElementById('evolution-video')
    const dragonImg = document.getElementById('dragon-img')

    if (videoEl) {
      // Setup video
      videoEl.src = 'mp4/eggcracking_to_baby.mp4'
      videoEl.classList.remove('hidden')
      if (dragonImg) dragonImg.classList.add('hidden')

      // Play
      videoEl.play().catch((e) => console.error('Video play failed:', e))

      // Cleanup when done
      videoEl.onended = () => {
        videoEl.classList.add('hidden')
        if (dragonImg) dragonImg.classList.remove('hidden')
        // Ensure we clear the source to stop buffering/memory usage
        videoEl.src = ''
      }
    }
  } else if (toStage === 'adult_grumpy') {
    // Special effect for turning into a grumpy adult
    // e.g., change background color momentarily, play a low pitch sound
    document.body.style.backgroundColor = '#555'
    setTimeout(() => {
      document.body.style.backgroundColor = ''
    }, 500)
  }

  // --------------------------------------
}
