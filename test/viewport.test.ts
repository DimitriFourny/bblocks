import assert from 'node:assert/strict';
import { test } from 'node:test';
import ViewBox from '../src/ViewBox';

function close(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} should equal ${expected}`);
}

test('fit contains a tall graph in a wide container without distortion', () => {
  const camera = new ViewBox();
  const bounds = { x: -100, y: 20, width: 200, height: 1800 };
  camera.fit(bounds, 1000, 400);
  assert.ok(camera.x < bounds.x && camera.y < bounds.y);
  assert.ok(camera.x + camera.width > bounds.x + bounds.width);
  assert.ok(camera.y + camera.height > bounds.y + bounds.height);
  close(camera.width / camera.height, 2.5);
});

test('cursor anchored zoom preserves the anchor screen position at different zoom levels', () => {
  const camera = new ViewBox();
  camera.fit({ x: 30, y: -90, width: 500, height: 700 }, 900, 600);
  const anchor = { x: 84, y: 173 };
  const relativeX = (anchor.x - camera.x) / camera.width;
  const relativeY = (anchor.y - camera.y) / camera.height;
  for (const factor of [1.5, 2, 0.25, 1e100, 1e-100]) {
    camera.zoom(factor, anchor);
    close((anchor.x - camera.x) / camera.width, relativeX);
    close((anchor.y - camera.y) / camera.height, relativeY);
    assert.ok(camera.width > 0 && camera.height > 0);
    assert.ok([camera.x, camera.y, camera.width, camera.height].every(Number.isFinite));
  }
});

test('container resize preserves graph center and the horizontal zoom level', () => {
  const camera = new ViewBox();
  camera.fit({ x: 0, y: 0, width: 800, height: 500 }, 1000, 700);
  camera.zoom(2, { x: 150, y: 200 });
  const center = { x: camera.x + camera.width / 2, y: camera.y + camera.height / 2 };
  const width = camera.width;
  camera.resize(350, 800);
  close(camera.x + camera.width / 2, center.x);
  close(camera.y + camera.height / 2, center.y);
  close(camera.width, width);
  close(camera.width / camera.height, 350 / 800);
});
