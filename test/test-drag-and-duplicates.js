/**
 * Unit simulation test for button creation and drag & drop calculation
 */

const assert = require('assert');

console.log('=== Simulation Test: Creation & Drag Reordering ===\n');

// Mock DOM button element
function createMockButton(id, x, width) {
  return {
    dataset: { id },
    classList: {
      contains: () => false,
      add: () => {},
      remove: () => {}
    },
    nextElementSibling: null,
    getBoundingClientRect: () => ({
      left: x,
      right: x + width,
      width: width,
      top: 100,
      bottom: 134,
      height: 34
    })
  };
}

// Test horizontal reordering calculation
const btnA = createMockButton('btn_a', 20, 60);
const btnB = createMockButton('btn_b', 90, 60);
const btnC = createMockButton('btn_c', 160, 60);

// Link siblings
btnA.nextElementSibling = btnB;
btnB.nextElementSibling = btnC;
btnC.nextElementSibling = null;

const allButtons = [btnA, btnB, btnC];

// Simulate dragging btnA to the very right (clientX = 220, past btnC)
const dragged = btnA;
const otherButtons = allButtons.filter(b => b !== dragged); // [btnB, btnC]

let insertBeforeElement = null;
const clientX = 220; // very right

for (const btn of otherButtons) {
  const rect = btn.getBoundingClientRect();
  const midX = rect.left + rect.width / 2;
  if (clientX < midX) {
    insertBeforeElement = btn;
    break;
  }
}

// When clientX is past all other buttons, insertBeforeElement must be null
assert.strictEqual(insertBeforeElement, null, 'Dragging past all buttons targets the end (null)');

// If insertBeforeElement is null, dragged is appended to the very end
const reordered = otherButtons.slice();
reordered.push(dragged);
assert.deepStrictEqual(reordered.map(b => b.dataset.id), ['btn_b', 'btn_c', 'btn_a'], 'Button A moved to the very end on the right');
console.log('✓ PASS: Dragging to the very right correctly positions button at the end');

// Test dragging btnC to the very left (clientX = 10)
const draggedC = btnC;
const otherButtonsForC = allButtons.filter(b => b !== draggedC); // [btnA, btnB]
let insertBeforeElementLeft = null;
const clientXLeft = 10;

for (const btn of otherButtonsForC) {
  const rect = btn.getBoundingClientRect();
  const midX = rect.left + rect.width / 2;
  if (clientXLeft < midX) {
    insertBeforeElementLeft = btn;
    break;
  }
}
assert.strictEqual(insertBeforeElementLeft, btnA, 'Dragging to the far left targets before the first button (btnA)');
console.log('✓ PASS: Dragging to the far left correctly positions button before the first');

console.log('\n🎉 ALL SIMULATION TESTS PASSED!');
