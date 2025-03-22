/**
 * Fake implementation of @actions/core for testing
 */

export const mockCore = {
  getInput: jest.fn().mockImplementation((name: string, options?: { required?: boolean }) => {
    if (options?.required && !mockCore._inputs[name]) {
      throw new Error(`Input required and not supplied: ${name}`);
    }
    return mockCore._inputs[name] || '';
  }),

  getBooleanInput: jest.fn().mockImplementation((name: string, options?: { required?: boolean }) => {
    const value = mockCore.getInput(name, options);
    return value.toLowerCase() === 'true';
  }),

  setOutput: jest.fn(),
  
  setFailed: jest.fn(),
  
  info: jest.fn(),
  
  warning: jest.fn(),
  
  error: jest.fn(),
  
  debug: jest.fn(),
  
  notice: jest.fn(),
  
  saveState: jest.fn().mockImplementation((name: string, value: string) => {
    mockCore._state[name] = value;
  }),
  
  getState: jest.fn().mockImplementation((name: string) => {
    return mockCore._state[name] || '';
  }),
  
  addPath: jest.fn(),
  
  exportVariable: jest.fn(),
  
  startGroup: jest.fn(),
  
  endGroup: jest.fn(),
  
  /**
   * Use this object to setup inputs for tests
   */
  _inputs: {} as Record<string, string>,
  
  /**
   * Use this object to store state for tests
   */
  _state: {} as Record<string, string>,
  
  /**
   * Reset all mocks and internal state
   */
  _reset: function() {
    Object.keys(this).forEach(key => {
      if (typeof this[key] === 'function' && 'mockClear' in this[key]) {
        this[key].mockClear();
      }
    });
    this._inputs = {};
    this._state = {};
  }
};

/**
 * Setup function to configure the mockCore with default values
 * @param inputs Optional inputs to set
 */
export function setupCoreMock(inputs: Record<string, string> = {}) {
  mockCore._reset();
  mockCore._inputs = { ...inputs };
  return mockCore;
}
