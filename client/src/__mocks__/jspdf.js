// Minimal jsPDF mock
const JsPDF = jest.fn().mockImplementation(() => ({
  addImage: jest.fn(),
  save: jest.fn(),
  setFont: jest.fn(),
  setFontSize: jest.fn(),
  text: jest.fn(),
  addPage: jest.fn(),
}));
export default JsPDF;
