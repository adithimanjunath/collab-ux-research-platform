// Return a "canvas-like" object with toDataURL
const html2canvas = jest.fn(async () => ({
  toDataURL: () => 'data:image/png;base64,deadbeef',
  width: 100,
  height: 100,
}));
export default html2canvas;
