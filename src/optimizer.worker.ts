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

interface Result {
    warnings: Warnings;
    grupos: any[];
    statistics: {
        parameters: OptimizationParameters;
        elapsedTimeMs: number;
        totalAlumnos: number;
        totalAssigned: number;
        unassigned: number;
        totalScore: number;
        perfectFitness: number;
        maxTeoricalFitness: number;
    }
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
    result: any | null;
    optimizationError: string | null;
}

const mulberry32 = (seed: number) => {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
};

const hashArray = (arr: number[]): string => {
    return arr.join(',');
};

const shuffleArray = <T>(array: T[], seed: number): T[] => {
    const random = mulberry32(seed);
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
};

const normalizeName = (name: string) => {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/\s+/g, ' ')
        .trim();
};

const calculateSimilarity = (str1: string, str2: string): number => {
    const levenshteinDistance = (str1: string, str2: string): number => {
        const m = str1.length;
        const n = str2.length;
        const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,    // deletion
                        dp[i][j - 1] + 1,    // insertion
                        dp[i - 1][j - 1] + 1 // substitution
                    );
                }
            }
        }
        return dp[m][n];
    };

    if (!str1 || !str2) return 0;

    const normalizedStr1 = normalizeName(str1);
    const normalizedStr2 = normalizeName(str2);

    // Exact match after normalization
    if (normalizedStr1 === normalizedStr2) return 1.0;

    // Check for abbreviation match first (higher priority than Levenshtein)
    // const parts1 = normalizedStr1.split(' ');
    // const parts2 = normalizedStr2.split(' ');
    // if (parts1.length >= 2 && parts2.length >= 2) {
    //   const lastNameMatch = parts1[parts1.length - 1] === parts2[parts2.length - 1];
    //   const firstInitialMatch = parts1[0].charAt(0) === parts2[0].charAt(0);
    //   if (lastNameMatch && parts1[0].length <= 2 && firstInitialMatch) {
    //     return 0.95; // High similarity for abbreviations
    //   }
    // }

    // Calculate Levenshtein similarity for other cases
    const maxLen = Math.max(normalizedStr1.length, normalizedStr2.length);
    if (maxLen === 0) return 1.0;

    const distance = levenshteinDistance(normalizedStr1, normalizedStr2);
    const similarity = 1 - (distance / maxLen);

    return Math.max(0, similarity);
};

console.log('Worker script loaded successfully!');

self.onmessage = (e) => {
    console.log('Worker received message from main thread:', !!e.data);

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
        individuals: { [key: string]: Individual };
        populationZero: string[];
        generations: Generation[];
    };

    const prepareData = (alumnosData: AlumnoData[], tutoresData: TutorData[], parameters: OptimizationParameters): { alumnos: Alumno[], tutores: Tutor[], warnings: Warnings } => {
        const warnings: Warnings = { others: [], unassignedAlumnos: [], tutoresNotFound: [] };
        const tutores = tutoresData.map((tutor, i) => ({
            ...Object.entries(tutor).reduce((p: any, [k, v]) => {
                p[k.toLowerCase()] = v;
                return p;
            }, {}), id: i
        }));

        const alumnos = alumnosData.map((alumno, i) => {
            alumno = Object.entries(alumno).reduce((p: any, [k, v]) => {
                if (k.toLowerCase().includes("tutor") && v !== "") {
                    p["tutores"] = (p["tutores"] || []);
                    p["tutores"].push(v);
                } else if (k.toLowerCase().includes("puntaje")) {
                    p.value = v;
                } else if (v !== "") {
                    p[k.toLowerCase()] = v;
                }
                return p;
            }, {});

            const alumnoTutores: Tutor[] = alumno.tutores.map((x) => {

                const matchRanking = tutores
                    .map(tutor => ({ ...tutor, score: calculateSimilarity(x, `${tutor.nombre} ${tutor.apellido}`) }))
                    .sort((a, b) => b.score - a.score);

                const bestMatch = matchRanking[0];

                if (bestMatch && bestMatch.score >= parameters.similarityThreshold) {
                    return bestMatch;
                } else {
                    warnings.tutoresNotFound.push({
                        alumno: `${alumno.nombre} ${alumno.apellido}`,
                        tutor: x,
                        closest: `${bestMatch.nombre} ${bestMatch.apellido}`,
                        score: bestMatch.score
                    })
                    return { score: 0, id: -1, nombre: "Nombre", apellido: "Apellido", email: "notfound" }
                }

            });
            return { ...alumno, tutores: alumnoTutores, id: i }
        });

        return { alumnos, tutores, warnings };
    };

    const getMaxScores = (alumnos: Alumno[], parameters: OptimizationParameters): { perfectFitness: number, maxTeoricalFitness: number } => {
        const perfectFitness = alumnos.reduce((p, x) =>
            p + x.tutores
                .reduce((pr, _y, i) => pr + x.value * parameters.pesoRelativoTutores[i], 0),
            0);

        const maxTeoricalFitness = alumnos.reduce((p, x) =>
            p + x.tutores
                .filter(y => y.id != -1)
                .reduce((pr, _y, i) => pr + x.value * parameters.pesoRelativoTutores[i], 0),
            0);

        return { perfectFitness, maxTeoricalFitness };
    };

    const calculateFitness = (grupos: Grupo[], alumnos: Alumno[], parameters: OptimizationParameters): number => {
        let fitness = 0;
        let penalty = 0;

        grupos.forEach(grupo => {
            // // Check for constraint violations
            // if (grupo.alumnos.length > parameters.maxAlumnosPorGrupo) {
            //   // Heavy penalty for exceeding max students
            //   penalty += (grupo.alumnos.length - parameters.maxAlumnosPorGrupo) * 1000;
            // }
            // if (grupo.tutores.length < parameters.minTutoresPorGrupo) {
            //   // Heavy penalty for not meeting min tutors
            //   penalty += (parameters.minTutoresPorGrupo - grupo.tutores.length) * 1000;
            // }
            // if (grupo.tutores.length > parameters.maxTutoresPorGrupo) {
            //   // Penalty for exceeding max tutors
            //   penalty += (grupo.tutores.length - parameters.maxTutoresPorGrupo) * 500;
            // }

            // Calculate positive fitness from matches
            const idTutoresGrupo = grupo.tutores.map(t => t.id);
            fitness += grupo.alumnos.reduce((pr, alumno) => {
                const idTutoresPreferidos = alumno.tutores.map(t => t.id);
                return pr + idTutoresPreferidos.reduce((pre, tutorPref, i) => {
                    if (idTutoresGrupo.includes(tutorPref)) {
                        pre = pre + alumno.value * parameters.pesoRelativoTutores[i];
                    }
                    return pre;
                }, 0);
            }, 0);
        });

        // Return fitness minus penalties (penalties reduce fitness)
        return Math.max(0, fitness - penalty);
    };

    const calculateGrupos = (individual: number[], alumnos: Alumno[], tutores: Tutor[], parameters: OptimizationParameters): Grupo[] => {

        const getGroups = (groupsN: number): { grupos: Grupo[], fitness: number } => {

            interface Slot { almunosSlots: number, tutoresSlots: number }
            const groupFitness = (alumno: Alumno, grupo: Grupo): number => {
                const idTutoresGrupo = grupo.tutores.map(x => x.id);
                const idTutoresPreferidos = alumno.tutores.map(t => t.id);
                return idTutoresPreferidos.reduce((pre, tutorPref, i) => {
                    if (idTutoresGrupo.includes(tutorPref)) {
                        pre = pre + alumno.value * parameters.pesoRelativoTutores[i];
                    }
                    return pre;
                }, 0);
            };

            const getNewGroup = (alumno: Alumno, grupos: Grupo[], slots: Slot[]): Grupo => {
                const slot = slots[grupos.length];
                const usedTutoresIds = grupos.map(x => x.tutores.map(y => y.id)).flat();

                const tutoresGrupo: Tutor[] = alumno.tutores.reduce((p, t, i) => {
                    if (!usedTutoresIds.includes(t.id) && slot.tutoresSlots > p.length) {
                        p.push(t);
                    }
                    return p;
                }, [] as Tutor[]);

                return { alumnos: [alumno], tutores: tutoresGrupo };
            };

            const slots: Slot[] = [];
            for (let i = 0; i < groupsN; i++) {
                let almunosSlots = alumnos.length / groupsN + (alumnos.length % groupsN > i ? 1 : 0);
                let tutoresSlots = tutores.length / groupsN + (tutores.length % groupsN > i ? 1 : 0);
                slots.push({ almunosSlots, tutoresSlots })
            }

            const grupos = individual.reduce((grupos, alumnoId, i) => {
                const alumno = alumnos.find(a => a.id === alumnoId) as Alumno;
                const bestAvailableGroup = grupos.filter((x, i) => x.alumnos.length < slots[i].almunosSlots).sort((a, b) => {
                    return groupFitness(alumno, b) - groupFitness(alumno, a)
                })[0];
                const bestNewGroup = grupos.length < groupsN ? getNewGroup(alumno, grupos, slots) : null;

                if (!bestAvailableGroup && bestNewGroup) grupos.push(bestNewGroup as Grupo);
                else if (!bestNewGroup && bestAvailableGroup) bestAvailableGroup.alumnos.push(alumno);
                else if (bestNewGroup && bestAvailableGroup)
                    groupFitness(alumno, bestNewGroup) > groupFitness(alumno, bestAvailableGroup) ?
                        grupos.push(bestNewGroup as Grupo) : bestAvailableGroup.alumnos.push(alumno);
                else throw "Something went wrong!";

                return grupos;
            }, [] as Grupo[]);
            const fitness = calculateFitness(grupos, alumnos, parameters);

            return { grupos, fitness }
        };

        const minGroups = Math.max(parameters.minCantidadGrupos, Math.ceil(tutores.length / parameters.maxTutoresPorGrupo), Math.ceil(alumnos.length / parameters.maxAlumnosPorGrupo));
        const maxGroups = Math.min(parameters.maxCantidadGrupos, Math.floor(tutores.length / parameters.minTutoresPorGrupo), Math.floor(alumnos.length / parameters.minAlumnosPorGrupo));

        const posibleResults = [];
        for (let i = minGroups; i <= maxGroups; i++) {
            posibleResults.push(getGroups(i));
        }
        if (posibleResults.length === 0) throw "Restricciones incompatibles!";
        return posibleResults.sort((a, b) => b.fitness - a.fitness)[0].grupos;
    };

    const initHistory = (alumnos: Alumno[], tutores: Tutor[], parameters: OptimizationParameters, rng: Function): History => {

        const alumnosIds = alumnos.map(x => x.id);
        const individuals: { [key: string]: Individual } = {};

        for (let i = 0; i < parameters.populationSize; i++) {
            let seed = Math.floor(rng() * 1000000);
            let individual = shuffleArray(alumnosIds, seed);
            let hash = hashArray(individual);
            let counter = 0;

            while (individuals[hash] != null) {
                console.log('Duplicate individual found, reshuffling...');
                seed = Math.floor(rng() * 1000000);
                individual = shuffleArray(alumnosIds, seed);
                hash = hashArray(individual);
                counter++;
                if (counter > 100) {
                    console.error('Too many attempts to find a unique individual');
                    break;
                }
            };
            const grupos = calculateGrupos(individual, alumnos, tutores, parameters);
            const fitness = calculateFitness(grupos, alumnos, parameters);

            individuals[hash] = {
                parentA: null,
                parentB: null,
                generation: 0,
                extintGeneration: null,
                alumnosIds: individual,
                grupos,
                fitness,
            };
        };

        // Calculate initial population statistics
        const initialFitnesses = Object.values(individuals).map(ind => ind.fitness);
        const initialBestFitness = Math.max(...initialFitnesses);
        const initialWorstFitness = Math.min(...initialFitnesses);
        const initialAverageFitness = initialFitnesses.reduce((sum, fitness) => sum + fitness, 0) / initialFitnesses.length;

        console.log(`Initial population - Best: ${initialBestFitness}, Worst: ${initialWorstFitness}, Average: ${initialAverageFitness.toFixed(2)}`);

        return {
            inititialTime: Date.now(),
            endTime: null,
            individuals,
            champion: Object.entries(individuals).sort((a, b) => b[1].fitness - a[1].fitness)[0][1],
            populationZero: Object.keys(individuals),
            generations: [],
        };
    };

    const iterate = (history: History, alumnos: Alumno[], tutores: Tutor[], parameters: OptimizationParameters, rng: Function) => {
        // Get current population (alive individuals)
        const currentPopulation = history.generations.length === 0
            ? history.populationZero
            : history.generations[history.generations.length - 1].individuals;

        const generation: Generation = {
            inititialTime: Date.now(),
            endTime: null,
            individuals: [],
            tournments: [],
            shuffleRepeats: 0,
            bestFitness: 0,
            worstFitness: Infinity,
            averageFitness: 0
        };

        // Elitism: keep the best individuals
        const sortedPopulation = currentPopulation
            .map(hash => ({ hash, fitness: history.individuals[hash].fitness }))
            .sort((a, b) => b.fitness - a.fitness);

        const elite = sortedPopulation.slice(0, parameters.elitismCount).map(item => item.hash);
        generation.individuals.push(...elite);

        // Generate offspring to fill the rest of the population
        const offspringNeeded = parameters.populationSize - elite.length;
        let duplicateAttempts = 0;

        for (let i = 0; i < offspringNeeded; i++) {
            let offspring: number[] | null = null;
            let offspringHash: string | null = null;
            let attempts = 0;
            const maxAttempts = 100;

            // Keep trying to create a unique offspring
            while (attempts < maxAttempts) {
                // Tournament selection for parents
                const parentAHash = tournamentSelect(currentPopulation, history.individuals, parameters.tournamentSize, rng);
                const parentBHash = tournamentSelect(currentPopulation, history.individuals, parameters.tournamentSize, rng);

                const parentA = history.individuals[parentAHash].alumnosIds;
                const parentB = history.individuals[parentBHash].alumnosIds;

                // Crossover
                if (rng() < parameters.crossoverRate) {
                    offspring = crossover(parentA, parentB, rng);
                } else {
                    offspring = [...parentA]; // Clone parent A
                }

                // Mutation
                if (rng() < parameters.mutationRate) {
                    offspring = mutate(offspring, rng);
                }

                offspringHash = hashArray(offspring);

                // Check for duplicates in both existing individuals and new generation
                if (!history.individuals[offspringHash] && !generation.individuals.includes(offspringHash)) {
                    // New unique individual found
                    const grupos = calculateGrupos(offspring, alumnos, tutores, parameters);
                    const fitness = calculateFitness(grupos, alumnos, parameters);

                    history.individuals[offspringHash] = {
                        parentA: parentAHash,
                        parentB: parentBHash,
                        generation: history.generations.length + 1,
                        extintGeneration: null,
                        alumnosIds: offspring,
                        grupos,
                        fitness
                    };

                    generation.individuals.push(offspringHash);

                    generation.tournments.push({
                        groupA: [parentAHash],
                        groupB: [parentBHash],
                        result: {
                            parentA: parentAHash,
                            parentB: parentBHash,
                            offspring: offspringHash,
                            crossover: rng() < parameters.crossoverRate
                        }
                    });
                    break;
                }

                attempts++;
                duplicateAttempts++;
            }

            // If we couldn't create a unique offspring after max attempts,
            // use forced mutation to ensure uniqueness
            if (attempts >= maxAttempts) {
                generation.shuffleRepeats++;
                offspring = forcedUniqueIndividual(alumnos.map(a => a.id), history.individuals, generation.individuals, rng);
                offspringHash = hashArray(offspring);

                const grupos = calculateGrupos(offspring, alumnos, tutores, parameters);
                const fitness = calculateFitness(grupos, alumnos, parameters);

                history.individuals[offspringHash] = {
                    parentA: null,
                    parentB: null,
                    generation: history.generations.length + 1,
                    extintGeneration: null,
                    alumnosIds: offspring,
                    grupos,
                    fitness
                };

                generation.individuals.push(offspringHash);
            }
        }

        // Mark extinct individuals (those not in new generation)
        currentPopulation.forEach(hash => {
            if (!generation.individuals.includes(hash)) {
                history.individuals[hash].extintGeneration = history.generations.length + 1;
            }
        });

        // Calculate fitness statistics for this generation
        const generationFitnesses = generation.individuals
            .map(hash => history.individuals[hash].fitness);

        generation.bestFitness = Math.max(...generationFitnesses);
        generation.worstFitness = Math.min(...generationFitnesses);
        generation.averageFitness = generationFitnesses.reduce((sum, fitness) => sum + fitness, 0) / generationFitnesses.length;

        // Update champion
        const newChampion = generation.individuals
            .map(hash => history.individuals[hash])
            .sort((a, b) => b.fitness - a.fitness)[0];

        if (newChampion.fitness > history.champion.fitness) {
            history.champion = newChampion;
        }

        generation.endTime = Date.now();
        history.generations.push(generation);

        return history;
    };

    const tournamentSelect = (population: string[], individuals: { [key: string]: Individual }, tournamentSize: number, rng: Function): string => {
        const tournament: string[] = [];
        for (let i = 0; i < tournamentSize; i++) {
            const randomIndex = Math.floor(rng() * population.length);
            tournament.push(population[randomIndex]);
        }

        return tournament.reduce((best, current) =>
            individuals[current].fitness > individuals[best].fitness ? current : best
        );
    };

    const crossover = (parentA: number[], parentB: number[], rng: Function): number[] => {
        // Order crossover (OX) - good for permutations
        const size = parentA.length;
        const start = Math.floor(rng() * size);
        const end = Math.floor(rng() * (size - start)) + start;

        const offspring = new Array(size).fill(-1);

        // Copy segment from parentA
        for (let i = start; i <= end; i++) {
            offspring[i] = parentA[i];
        }

        // Fill remaining positions from parentB
        let currentPos = 0;
        for (let i = 0; i < size; i++) {
            if (!offspring.includes(parentB[i])) {
                while (offspring[currentPos] !== -1) {
                    currentPos++;
                }
                offspring[currentPos] = parentB[i];
            }
        }

        return offspring;
    };

    const mutate = (individual: number[], rng: Function): number[] => {
        const mutated = [...individual];
        // Swap mutation
        const pos1 = Math.floor(rng() * mutated.length);
        const pos2 = Math.floor(rng() * mutated.length);
        [mutated[pos1], mutated[pos2]] = [mutated[pos2], mutated[pos1]];
        return mutated;
    };

    const forcedUniqueIndividual = (
        alumnosIds: number[],
        existingIndividuals: { [key: string]: Individual },
        newGeneration: string[],
        rng: Function
    ): number[] => {
        let individual: number[];
        let hash: string;

        // Keep shuffling until we get a unique one
        do {
            const seed = Math.floor(rng() * 1000000000);
            individual = shuffleArray(alumnosIds, seed);
            hash = hashArray(individual);
        } while (existingIndividuals[hash] || newGeneration.includes(hash));

        return individual;
    };

    try {
        console.log('Optimization process started with state:', e);
        const state = e.data as { app: AppState };
        
        const { alumnosData, tutoresData, parameters } = state.app;
        const { alumnos, tutores, warnings } = prepareData(alumnosData, tutoresData, parameters);
        const { perfectFitness, maxTeoricalFitness } = getMaxScores(alumnos, parameters);

        console.log('Starting genetic algorithm with:', { alumnosData, tutoresData, parameters, alumnos, tutores, warnings, perfectFitness, maxTeoricalFitness });
        let currentBestScore = 0;
        const rng = mulberry32(parameters.seed || 42);
        console.log('RNG initialized with seed', parameters.seed);
        let history = initHistory(alumnos, tutores, parameters, rng);
        let percentageCompleted = 0;
        console.log({ alumnos, tutores, parameters, perfectFitness, maxTeoricalFitness });
        for (let i = 0; i < parameters.geneticIterations && currentBestScore < perfectFitness; i++) {
            iterate(history, alumnos, tutores, parameters, rng);
            currentBestScore = history.champion.fitness;
            percentageCompleted = (i + 1) / parameters.geneticIterations;

            const lastGen = history.generations[history.generations.length - 1];
            console.log(`Iteration ${i + 1}/${parameters.geneticIterations} - ${Math.round(percentageCompleted * 100)}% completed`);
            console.log(`  Generation stats - Best: ${lastGen.bestFitness.toFixed(4)}, Worst: ${lastGen.worstFitness.toFixed(4)}, Avg: ${lastGen.averageFitness.toFixed(4)}`);
        }

        history.endTime = Date.now();
        console.log('Total duration:', ((history.endTime - history.inititialTime) / 1000.000).toFixed(3), 'seconds');
        console.log('Optimization process finished:', { history, currentBestScore, perfectFitness, maxTeoricalFitness });
        console.log('Best individuals:', Object.entries(history.individuals).sort((a, b) => (b[1].fitness || 0) - (a[1].fitness || 0)).map(x => x[1]));

        self.postMessage({
            type: "finish",
            warnings,
            grupos: history.champion.grupos,
            statistics: {
                parameters,
                elapsedTimeMs: history.endTime - history.inititialTime,
                totalAlumnos: alumnos.length,
                totalAssigned: alumnos.length - warnings.unassignedAlumnos.length,
                unassigned: warnings.unassignedAlumnos.length,
                totalScore: history.champion.fitness,
                perfectFitness,
                maxTeoricalFitness,
                generationsEvolved: history.generations.length,
                fitnessEvolution: history.generations.map(gen => ({
                    best: gen.bestFitness,
                    worst: gen.worstFitness,
                    average: gen.averageFitness
                }))
            }
        });
    } catch (error) {
        console.error('Error optimizing groups:', error);
        self.postMessage({
            type: "error",
            error: error instanceof Error ? error.message : 'Optimization failed'
        });
    }


};