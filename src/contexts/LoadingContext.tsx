import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';

interface LoadingState {
  globalLoading: boolean;
  operations: LoadingOperation[];
}

interface LoadingOperation {
  id: string;
  type: 'file_upload' | 'git_clone' | 'code_parsing' | 'ai_analysis' | 'general';
  title: string;
  description?: string;
  progress: number; // 0-100
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  estimatedDuration?: number; // in milliseconds
  subOperations?: SubOperation[];
}

interface SubOperation {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
}

type LoadingAction =
  | { type: 'SET_GLOBAL_LOADING'; payload: boolean }
  | { type: 'START_OPERATION'; payload: Omit<LoadingOperation, 'id' | 'startTime' | 'progress' | 'status'> }
  | { type: 'UPDATE_OPERATION'; payload: { id: string; updates: Partial<LoadingOperation> } }
  | { type: 'COMPLETE_OPERATION'; payload: string }
  | { type: 'FAIL_OPERATION'; payload: { id: string; error?: string } }
  | { type: 'REMOVE_OPERATION'; payload: string }
  | { type: 'CLEAR_OPERATIONS' }
  | { type: 'UPDATE_SUB_OPERATION'; payload: { operationId: string; subOperationId: string; updates: Partial<SubOperation> } };

interface LoadingContextType {
  state: LoadingState;
  setGlobalLoading: (loading: boolean) => void;
  startOperation: (operation: Omit<LoadingOperation, 'id' | 'startTime' | 'progress' | 'status'>) => string;
  updateOperation: (id: string, updates: Partial<LoadingOperation>) => void;
  updateProgress: (id: string, progress: number) => void;
  completeOperation: (id: string) => void;
  failOperation: (id: string, error?: string) => void;
  removeOperation: (id: string) => void;
  clearOperations: () => void;
  addSubOperation: (operationId: string, subOperation: Omit<SubOperation, 'id'>) => string;
  updateSubOperation: (operationId: string, subOperationId: string, updates: Partial<SubOperation>) => void;
  isLoading: (type?: LoadingOperation['type']) => boolean;
  getOperation: (id: string) => LoadingOperation | undefined;
  getActiveOperations: () => LoadingOperation[];
}

const initialState: LoadingState = {
  globalLoading: false,
  operations: [],
};

function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'SET_GLOBAL_LOADING':
      return {
        ...state,
        globalLoading: action.payload,
      };

    case 'START_OPERATION':
      const newOperation: LoadingOperation = {
        ...action.payload,
        id: generateId(),
        startTime: new Date(),
        progress: 0,
        status: 'running',
      };
      return {
        ...state,
        operations: [...state.operations, newOperation],
      };

    case 'UPDATE_OPERATION':
      return {
        ...state,
        operations: state.operations.map(op =>
          op.id === action.payload.id
            ? { ...op, ...action.payload.updates }
            : op
        ),
      };

    case 'COMPLETE_OPERATION':
      return {
        ...state,
        operations: state.operations.map(op =>
          op.id === action.payload
            ? { ...op, status: 'completed', progress: 100, endTime: new Date() }
            : op
        ),
      };

    case 'FAIL_OPERATION':
      return {
        ...state,
        operations: state.operations.map(op =>
          op.id === action.payload.id
            ? { ...op, status: 'failed', endTime: new Date() }
            : op
        ),
      };

    case 'REMOVE_OPERATION':
      return {
        ...state,
        operations: state.operations.filter(op => op.id !== action.payload),
      };

    case 'CLEAR_OPERATIONS':
      return {
        ...state,
        operations: [],
      };

    case 'UPDATE_SUB_OPERATION':
      return {
        ...state,
        operations: state.operations.map(op =>
          op.id === action.payload.operationId
            ? {
                ...op,
                subOperations: op.subOperations?.map(subOp =>
                  subOp.id === action.payload.subOperationId
                    ? { ...subOp, ...action.payload.updates }
                    : subOp
                ) || [],
              }
            : op
        ),
      };

    default:
      return state;
  }
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [state, dispatch] = useReducer(loadingReducer, initialState);

  const setGlobalLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_GLOBAL_LOADING', payload: loading });
  }, []);

  const startOperation = useCallback((operation: Omit<LoadingOperation, 'id' | 'startTime' | 'progress' | 'status'>) => {
    const id = generateId();
    dispatch({
      type: 'START_OPERATION',
      payload: { ...operation, id } as any,
    });
    return id;
  }, []);

  const updateOperation = useCallback((id: string, updates: Partial<LoadingOperation>) => {
    dispatch({
      type: 'UPDATE_OPERATION',
      payload: { id, updates },
    });
  }, []);

  const updateProgress = useCallback((id: string, progress: number) => {
    dispatch({
      type: 'UPDATE_OPERATION',
      payload: { id, updates: { progress: Math.max(0, Math.min(100, progress)) } },
    });
  }, []);

  const completeOperation = useCallback((id: string) => {
    dispatch({ type: 'COMPLETE_OPERATION', payload: id });
  }, []);

  const failOperation = useCallback((id: string, error?: string) => {
    dispatch({ type: 'FAIL_OPERATION', payload: { id, error } });
  }, []);

  const removeOperation = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_OPERATION', payload: id });
  }, []);

  const clearOperations = useCallback(() => {
    dispatch({ type: 'CLEAR_OPERATIONS' });
  }, []);

  const addSubOperation = useCallback((operationId: string, subOperation: Omit<SubOperation, 'id'>) => {
    const subId = generateId();
    const operation = state.operations.find(op => op.id === operationId);
    if (operation) {
      const newSubOperation: SubOperation = { ...subOperation, id: subId };
      dispatch({
        type: 'UPDATE_OPERATION',
        payload: {
          id: operationId,
          updates: {
            subOperations: [...(operation.subOperations || []), newSubOperation],
          },
        },
      });
    }
    return subId;
  }, [state.operations]);

  const updateSubOperation = useCallback((operationId: string, subOperationId: string, updates: Partial<SubOperation>) => {
    dispatch({
      type: 'UPDATE_SUB_OPERATION',
      payload: { operationId, subOperationId, updates },
    });
  }, []);

  const isLoading = useCallback((type?: LoadingOperation['type']) => {
    if (state.globalLoading) return true;
    
    if (type) {
      return state.operations.some(op => op.type === type && op.status === 'running');
    }
    
    return state.operations.some(op => op.status === 'running');
  }, [state.globalLoading, state.operations]);

  const getOperation = useCallback((id: string) => {
    return state.operations.find(op => op.id === id);
  }, [state.operations]);

  const getActiveOperations = useCallback(() => {
    return state.operations.filter(op => op.status === 'running');
  }, [state.operations]);

  const value: LoadingContextType = {
    state,
    setGlobalLoading,
    startOperation,
    updateOperation,
    updateProgress,
    completeOperation,
    failOperation,
    removeOperation,
    clearOperations,
    addSubOperation,
    updateSubOperation,
    isLoading,
    getOperation,
    getActiveOperations,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextType {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}