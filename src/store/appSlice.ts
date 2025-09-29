import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

interface Warnings {
  others: string[];
  unassignedAlumnos: string[];
  tutoresNotFound: { alumno: string; tutor: string, closest: string, score: number }[];
}

interface OptimizationParameters {
  // Genetic algorithm parameters, n should be at least 20-30, ideally 2-5x the chromosome length
  // Keep n x iterations < 1M
  seed: number;
  geneticIterations: number; // 5 - 100
  populationSize: number; // < 2^n
  mutationRate: number; // 0.05-0.2 typical (10% chance)
  crossoverRate: number; // 0.6-0.9 typical (70% chance)
  tournamentSize: number; // < n / 2 //  2-3 for exploration, 4-5 for exploitation
  elitismCount: number; // 0 - 1 // 2-5% of population size

  // Assignment parameters
  minCantidadGrupos: number;
  maxCantidadGrupos: number;
  minAlumnosPorGrupo: number;
  maxAlumnosPorGrupo: number;
  minTutoresPorGrupo: number;
  maxTutoresPorGrupo: number;
  similarityThreshold: number;
  pesoRelativoTutores: number[];
}

interface Tutor { nombre: string, apellido: string, email: string, id: number }

interface Alumno { nombre: string, apellido: string, email: string, value: number, tutores: Tutor[], id: number }

interface Grupo { tutores: Tutor[], alumnos: Alumno[] };


interface Individual {
  parentA: string | null;
  parentB: string | null;
  generation: number;
  extintGeneration: number | null;
  alumnosIds: number[];
  grupos: Grupo[];
  fitness: number;
};

interface Generation {
  i: number;
  inititialTime: number;
  endTime: number | null;

  individuals: string[];
  tournments: {
    groupA: string[];
    groupB: string[];
    result: {
      parentA: string;
      parentB: string;
      offspring: string;
      crossover: boolean;
    }
  }[];

  shuffleRepeats: number;

  // Fitness statistics
  bestFitness: number;
  worstFitness: number;
  averageFitness: number;
};
interface History {
  inititialTime: number;
  endTime: number | null;

  champion: Individual;
  worst: Individual;
  individuals: { [key: string]: Individual };
  populationZero: string[];
  generations: Generation[];
};

interface Result {
  warnings: Warnings;
  history: History;
  parameters: OptimizationParameters
}

interface AlumnoData { nombre: string, apellido: string, email: string, value: number, tutores: string[] }

interface TutorData { nombre: string, apellido: string, email: string }

interface AppState {
  // Data states
  alumnosData: AlumnoData[];
  tutoresData: TutorData[];
  alumnosColumns: any[];
  tutoresColumns: any[];
  alumnosFileName: string | null;
  tutoresFileName: string | null;

  // UI states
  selectedSidebarTab: string;
  sidebarOpen: boolean;

  // Algorithm parameters
  parameters: OptimizationParameters;

  // Results
  running: boolean;
  runningPercentage: number;
  result: Result | null;
  optimizationError: string | null;

  // Dynamic
  generation: Generation | null,
  totalIterations: number | null,
  currentBestScore: number | null,
  currentWorstScore: number | null,
  perfectFitness: number | null,
  maxTeoricalFitness: number | null,
  combinations: number | null

}

const initialState: AppState = {
  alumnosData: [],
  tutoresData: [],
  alumnosColumns: [],
  tutoresColumns: [],
  alumnosFileName: null,
  tutoresFileName: null,

  selectedSidebarTab: 'Tutores',
  sidebarOpen: true,

  parameters: {
    seed: 42,
    geneticIterations: 500,
    populationSize: 100,
    mutationRate: 0.1,
    crossoverRate: 0.5,
    tournamentSize: 5,
    elitismCount: 2,

    minCantidadGrupos: 10,
    maxCantidadGrupos: 30,
    minAlumnosPorGrupo: 1,
    maxAlumnosPorGrupo: 10,
    minTutoresPorGrupo: 1,
    maxTutoresPorGrupo: 5,
    similarityThreshold: 0.8,
    pesoRelativoTutores: [10, 8, 5, 3, 1],
  },

  running: false,
  runningPercentage: 0,
  result: null,
  optimizationError: null,

  generation: null,
  totalIterations: null,
  currentBestScore: null,
  currentWorstScore: null,
  perfectFitness: null,
  maxTeoricalFitness: null,
  combinations: null
};

// Import the worker using Vite's worker syntax
import OptimizerWorker from '../optimizer.worker.ts?worker';

export const optimizeGroups = createAsyncThunk(
  'app/optimizeGroups',
  async (payload, { getState, rejectWithValue, dispatch }) => {
    console.log("optimizeGroups")
    return new Promise((resolve, reject) => {
      const worker = new OptimizerWorker();
      let state = getState() as AppState;
      worker.onmessage = (e) => {
        if (e.data.type === "error") {
          reject(new Error(e.data.error));
        } else if (e.data.type === "update") {
          dispatch(appSlice.actions.optimizationUpdate(e.data.payload));
        } else if (e.data.type === "finish") {
          resolve(e.data);
          worker.terminate(); // Clean up the worker
          state = { ...state, running: false }

        };
      }
      worker.onerror = (e) => {
        console.log("onerror:", e);
        reject(new Error('Worker failed to load or execute'));
        worker.terminate();
      };
      worker.postMessage(state);
    });
  }
);

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // UI actions
    setSidebarTab: (state, action: PayloadAction<string>) => {
      state.selectedSidebarTab = action.payload;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    // Data actions
    setFile: (state, action: PayloadAction<{ type: string, fileName: string, data: any[], columns: any[] }>) => {
      console.log('Setting file data:', action.payload);
      if (action.payload.type === 'alumnos') {
        state.alumnosData = action.payload.data;
        state.alumnosColumns = action.payload.columns;
        state.alumnosFileName = action.payload.fileName;
      } else if (action.payload.type === 'tutores') {
        state.tutoresData = action.payload.data;
        state.tutoresColumns = action.payload.columns;
        state.tutoresFileName = action.payload.fileName;
      }
      console.log('Finished Setting file data:', action.payload);
    },

    // Parameter actions
    setParameters: (state, action: PayloadAction<Partial<OptimizationParameters>>) => {
      state.parameters = { ...state.parameters, ...action.payload };
    },

    // Clear actions
    clearOptimizationError: (state) => {
      state.optimizationError = null;
    },

    optimizationUpdate: (state, action: PayloadAction<any>) => {
      const { generation, totalIterations, currentBestScore, currentWorstScore, perfectFitness, maxTeoricalFitness, runningPercentage, combinations } = action.payload;
      state.running = true;
      state.runningPercentage = runningPercentage;
      state.generation = generation;
      state.totalIterations = totalIterations;
      state.currentBestScore = currentBestScore;
      state.currentWorstScore = currentWorstScore;
      state.perfectFitness = perfectFitness;
      state.maxTeoricalFitness = maxTeoricalFitness;
      state.combinations = combinations;
    }

  },
  extraReducers: (builder) => {
    builder
      .addCase(optimizeGroups.pending, (state) => {
        state.running = true;
        state.runningPercentage = 0;
        state.optimizationError = null;
      })
      .addCase(optimizeGroups.fulfilled, (state, action) => {
        state.running = false;
        state.runningPercentage = 1;
        state.result = action.payload as Result;
      })
      .addCase(optimizeGroups.rejected, (state, action) => {
        state.running = false;
        state.optimizationError = action.payload as string;
      });
  },
});

export const {
  setFile,
  setSidebarTab,
  setSidebarOpen,
  setParameters,
  clearOptimizationError,
} = appSlice.actions;

export default appSlice.reducer;