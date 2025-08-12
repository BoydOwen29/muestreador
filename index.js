
import { GoogleGenAI } from "https://esm.sh/@google/genai@^1.13.0";

// --- STATE MANAGEMENT ---
const state = {
  theme: 'light',
  appState: 'upload', // 'upload', 'config', 'preview'
  isLoading: false,
  isSummaryLoading: false,
  error: null,
  fileInfo: null, // { name, totalRows }
  originalData: null, // array of arrays
  sampleData: null, // array of arrays
  geminiSummary: null,
};

// --- DOM ELEMENTS ---
const appContainer = document.getElementById('app-container');
const errorContainer = document.getElementById('error-container');
const themeToggleButton = document.getElementById('theme-toggle');

// --- ICONS (as string templates) ---
const ICONS = {
    sun: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    moon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    upload: (className) => `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`,
    file: (className) => `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`,
    download: (className) => `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    reset: (className) => `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M21 21v-5h-5"></path></svg>`,
    spinner: `<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>`,
    brain: (className) => `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4.5 4.5 0 0 0-4.5 4.5c0 1.43.69 2.72 1.76 3.54A4.5 4.5 0 0 0 12 12a4.5 4.5 0 0 0 4.5-4.5c0-1.43-.69-2.72-1.76-3.54A4.5 4.5 0 0 0 12 2Z"></path><path d="M12 12v2.5c0 1.25-.31 2.44-.88 3.5h0a4.52 4.52 0 0 1-1.21 1.48A4.5 4.5 0 0 0 12 22a4.5 4.5 0 0 0 2.59-8.02A4.52 4.52 0 0 1 13.38 18h0c-.57-1.06-.88-2.25-.88-3.5V12"></path><path d="M6.24 3.54A4.5 4.5 0 0 1 7.5 7.5c0 1.51.78 2.83 1.93 3.59"></path><path d="M14.57 11.09c1.15-.76 1.93-2.08 1.93-3.59a4.5 4.5 0 0 0-1.26-3.96"></path><path d="M3.5 9.5a4.5 4.5 0 0 0 4.5 4.5c.15 0 .29 0 .44-.02"></path><path d="M20.5 9.5a4.5 4.5 0 0 1-4.5 4.5c-.15 0-.29 0-.44-.02"></path><path d="M8 16.5a4.5 4.5 0 0 1 4-4.49"></path><path d="M16 16.5a4.5 4.5 0 0 0-4-4.49"></path></svg>`,
};

// --- GEMINI SERVICE ---
// This assumes the execution environment provides `process.env.API_KEY`.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


const formatDataToCsv = (data) => {
  return data.map(row => 
    row.map(cell => {
      const cellStr = String(cell === null || cell === undefined ? '' : cell);
      if (cellStr.includes('"') || cellStr.includes(',')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
};

const generateDataSummary = async (sampleData) => {
    setState({ isSummaryLoading: true });

    const dataForAnalysis = sampleData.slice(0, 51); // Header + 50 rows
    const csvData = formatDataToCsv(dataForAnalysis);

    const prompt = `
      Eres un analista de datos experto. A continuación se presenta una muestra de datos en formato CSV extraída de un conjunto de datos más grande. 
      Tu tarea es analizar esta muestra y proporcionar un resumen ejecutivo conciso e inteligente en Markdown.

      Instrucciones:
      1.  **Identifica las columnas clave**: Determina cuáles parecen ser las columnas más importantes.
      2.  **Resume la distribución**: Para columnas numéricas, describe brevemente la tendencia central y la dispersión. Para categóricas, menciona las categorías más frecuentes.
      3.  **Detecta patrones o ideas interesantes**: Busca cualquier relación, anomalía o patrón obvio en los datos.
      4.  **Conclusión**: Finaliza con una conclusión de alto nivel sobre lo que los datos sugieren.
      5.  **Formato**: Presenta tu análisis en español, usando formato Markdown (títulos con '#', listas con '*'). No incluyas el bloque de código CSV en la respuesta, solo el análisis.

      Muestra de datos (CSV):
      ---
      ${csvData}
      ---

      Por favor, genera el resumen ejecutivo en Markdown.
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      setState({ geminiSummary: response.text });
    } catch (error) {
      console.error("Error al generar el resumen con Gemini:", error);
      const errorMessage = error instanceof Error ? `Error al contactar la API de Gemini: ${error.message}` : "Ocurrió un error desconocido al generar el resumen.";
      setState({ geminiSummary: errorMessage });
    } finally {
      setState({ isSummaryLoading: false });
    }
};


// --- HTML TEMPLATES FOR VIEWS ---

const FileUploadView = () => `
  <div class="w-full max-w-2xl mx-auto">
    <div class="bg-white dark:bg-slate-800 shadow-lg rounded-xl p-8">
      <h2 class="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">Subir Archivo de Datos</h2>
      <p class="text-center text-slate-500 dark:text-slate-400 mb-6">Arrastra y suelta tu archivo (.xlsx, .xls, .csv) o haz clic para seleccionar.</p>
      <label id="dropzone" for="file-upload" class="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50">
        <div class="flex flex-col items-center justify-center pt-5 pb-6">
          ${ICONS.upload('w-10 h-10 mb-3 text-slate-400')}
          <p class="mb-2 text-sm text-slate-500 dark:text-slate-400"><span class="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">XLSX, XLS o CSV</p>
        </div>
        <input id="file-upload" type="file" class="hidden" accept=".xlsx,.xls,.csv" />
        ${state.isLoading ? `<div class="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex items-center justify-center rounded-lg">${ICONS.spinner} <span class="ml-2">Procesando...</span></div>` : ''}
      </label>
    </div>
  </div>
`;

const SamplingConfigView = () => `
  <div class="w-full max-w-2xl mx-auto">
      <div class="bg-white dark:bg-slate-800 shadow-lg rounded-xl p-8">
          <div class="flex justify-between items-start mb-6">
              <div>
                  <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Configurar Muestreo</h2>
                  <div class="flex items-center text-slate-500 dark:text-slate-400 mt-2">
                     ${ICONS.file('w-4 h-4 mr-2')}
                     <span>${state.fileInfo.name} (${state.fileInfo.totalRows} filas)</span>
                  </div>
              </div>
              <button id="reset-button" class="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Empezar de nuevo">
                  ${ICONS.reset('w-6 h-6')}
              </button>
          </div>
          
          <div class="space-y-6">
              <div>
                  <h3 class="text-lg font-semibold mb-3">1. Elige un método de muestreo</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="sampling-method-group">
                      <label class="p-4 border rounded-lg cursor-pointer transition-all bg-sky-50 border-sky-500 dark:bg-sky-900/50 dark:border-sky-500">
                          <input type="radio" name="samplingMethod" value="confidence" checked class="sr-only" />
                          <span class="font-bold text-slate-700 dark:text-slate-200">Intervalo de Confianza</span>
                          <p class="text-sm text-slate-500 dark:text-slate-400">Calcula el tamaño de muestra automáticamente.</p>
                      </label>
                      <label class="p-4 border rounded-lg cursor-pointer transition-all bg-slate-50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600">
                          <input type="radio" name="samplingMethod" value="fixed" class="sr-only" />
                          <span class="font-bold text-slate-700 dark:text-slate-200">Tamaño Fijo</span>
                          <p class="text-sm text-slate-500 dark:text-slate-400">Define un número exacto de filas.</p>
                      </label>
                  </div>
              </div>

              <div id="params-container">
                  <h3 class="text-lg font-semibold mb-3">2. Ajusta los parámetros</h3>
                  <div id="params-fields">
                      <div>
                          <label for="confidence" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nivel de Confianza</label>
                          <select id="confidence" class="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md focus:ring-sky-500 focus:border-sky-500">
                              <option value="90">90%</option>
                              <option value="95" selected>95%</option>
                              <option value="99">99%</option>
                          </select>
                      </div>
                  </div>
              </div>
          </div>

          <div class="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <button id="generate-button" class="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600">
                  ${state.isLoading ? ICONS.spinner : 'Generar Muestra'}
              </button>
          </div>
      </div>
  </div>
`;

const SamplePreviewView = () => {
    const headers = state.sampleData[0] || [];
    const rows = state.sampleData.slice(1, 11); // Preview first 10 rows

    const geminiAnalysisHTML = () => {
        // The AI card is always shown if an API key is expected to be present.
        if (state.isSummaryLoading) {
            return `
              <div class="bg-white dark:bg-slate-800 shadow-lg rounded-xl p-8">
                <div class="flex items-center mb-4">
                  ${ICONS.brain('w-6 h-6 mr-3 text-sky-500')}
                  <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">Analizando con IA...</h3>
                </div>
                <div class="space-y-4">
                  <div class="h-4 w-3/4 rounded shimmer-bg"></div>
                  <div class="h-4 w-full rounded shimmer-bg"></div>
                  <div class="h-4 w-5/6 rounded shimmer-bg"></div>
                </div>
              </div>
            `;
        }
        if (state.geminiSummary) {
            // A simple markdown to HTML converter for lists and bold text
            const formattedSummary = state.geminiSummary
                .replace(/^\s*#\s*(.*)/gm, '<h4 class="text-lg font-semibold mt-4 mb-2">$1</h4>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/^\s*\*\s*(.*)/gm, '<li class="ml-5">$1</li>')
                .replace(/<\/li>\s*<li/g, '</li><li')
                .replace(/<li/g, '<ul class="list-disc"><li')
                .replace(/<\/li>(?!<li)/g, '</li></ul>')
                .replace(/\n/g, '<br />');

            return `
              <div class="bg-white dark:bg-slate-800 shadow-lg rounded-xl p-8">
                <div class="flex items-center mb-4">
                   ${ICONS.brain('w-6 h-6 mr-3 text-sky-500')}
                   <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">Análisis con IA</h3>
                </div>
                <div class="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">${formattedSummary}</div>
              </div>
            `;
        }
        return '';
    };

    return `
    <div class="w-full max-w-6xl mx-auto space-y-8">
        <div class="bg-white dark:bg-slate-800 shadow-lg rounded-xl p-8">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100">Resultados del Muestreo</h2>
                <button id="reset-button" class="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Empezar de nuevo">${ICONS.reset('w-6 h-6')}</button>
            </div>
            
            <p class="text-slate-600 dark:text-slate-300 mb-4">Se ha generado una muestra de <span class="font-bold text-sky-600 dark:text-sky-400">${state.sampleData.length - 1}</span> filas. A continuación se muestra una vista previa.</p>

            <div class="overflow-x-auto table-scrollbar border border-slate-200 dark:border-slate-700 rounded-lg">
                <table class="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead class="text-xs text-slate-700 uppercase bg-slate-100 dark:text-slate-300 dark:bg-slate-700">
                        <tr>${headers.map(h => `<th scope="col" class="px-6 py-3">${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr class="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                ${row.map(cell => `<td class="px-6 py-4 whitespace-nowrap">${String(cell)}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="mt-6">
                <button id="download-button" class="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors">
                    ${ICONS.download('w-5 h-5 mr-2')} Descargar Muestra (.xlsx)
                </button>
            </div>
        </div>
        ${geminiAnalysisHTML()}
    </div>
    `;
};


// --- RENDER & STATE LOGIC ---

function setState(newState) {
    Object.assign(state, newState);
    render();
}

function render() {
    // Render main view
    switch (state.appState) {
        case 'config':
            appContainer.innerHTML = SamplingConfigView();
            break;
        case 'preview':
            appContainer.innerHTML = SamplePreviewView();
            break;
        case 'upload':
        default:
            appContainer.innerHTML = FileUploadView();
            break;
    }

    // Render theme toggle
    themeToggleButton.innerHTML = state.theme === 'light' ? ICONS.moon : ICONS.sun;
    if (state.theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // Render error
    if (state.error) {
        errorContainer.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert"><span class="block sm:inline">${state.error}</span></div>`;
        setTimeout(() => setState({ error: null }), 5000);
    } else {
        errorContainer.innerHTML = '';
    }
}

// --- EVENT HANDLERS ---

function handleFileSelect(file) {
    if (!file) return;
    setState({ isLoading: true, error: null });
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if(json.length < 2) {
                throw new Error("El archivo está vacío o no tiene datos (se requiere encabezado y una fila).");
            }
            
            setState({
                originalData: json,
                fileInfo: { name: file.name, totalRows: json.length - 1 },
                appState: 'config',
                isLoading: false,
            });
        } catch (err) {
            setState({
                error: err instanceof Error ? err.message : "Error al procesar el archivo.",
                isLoading: false
            });
        }
    };
    reader.onerror = () => {
        setState({ error: "No se pudo leer el archivo.", isLoading: false });
    };
    reader.readAsArrayBuffer(file);
}

function handleGenerateSample() {
    setState({ isLoading: true });

    setTimeout(() => { // Simulate processing time
        const method = document.querySelector('input[name="samplingMethod"]:checked').value;
        const header = state.originalData[0];
        const dataRows = state.originalData.slice(1);
        const N = dataRows.length;
        let sampleSize = 0;

        if (method === 'fixed') {
            const fixedSizeInput = document.getElementById('fixed-size');
            const size = Number(fixedSizeInput.value);
            if (size <= 0 || size > N) {
                setState({ error: `El tamaño debe ser entre 1 y ${N}.`, isLoading: false });
                return;
            }
            sampleSize = Math.floor(size);
        } else { // Confidence
            const confidenceLevel = Number(document.getElementById('confidence').value);
            const Z_SCORES = { 90: 1.645, 95: 1.96, 99: 2.576 };
            const Z = Z_SCORES[confidenceLevel];
            const p = 0.5;
            const e = 0.05;

            const n0 = (Z * Z * p * (1-p)) / (e * e);
            sampleSize = Math.ceil(n0 / (1 + (n0 - 1) / N));
        }

        if (sampleSize > N) sampleSize = N;

        const shuffled = [...dataRows];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const newSample = [header, ...shuffled.slice(0, sampleSize)];
        setState({ sampleData: newSample, appState: 'preview', isLoading: false });
        
        // Start AI analysis in the background
        generateDataSummary(newSample);
    }, 500);
}

function handleDownload() {
    const worksheet = XLSX.utils.aoa_to_sheet(state.sampleData);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, worksheet, 'Muestra');
    const newFileName = `Muestra_${state.fileInfo.name.replace(/\.[^/.]+$/, "")}.xlsx`;
    XLSX.writeFile(newWorkbook, newFileName);
}

function handleReset() {
    setState({
        appState: 'upload',
        isLoading: false,
        isSummaryLoading: false,
        error: null,
        fileInfo: null,
        originalData: null,
        sampleData: null,
        geminiSummary: null,
    });
}

function handleThemeToggle() {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    setState({ theme: newTheme });
}

function setupInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setState({ theme: savedTheme || (prefersDark ? 'dark' : 'light') });
}


// --- GLOBAL EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    setupInitialTheme();
    themeToggleButton.addEventListener('click', handleThemeToggle);

    appContainer.addEventListener('change', (e) => {
        if (e.target.id === 'file-upload') {
            handleFileSelect(e.target.files[0]);
        }
        if (e.target.name === 'samplingMethod') {
            const paramsFields = document.getElementById('params-fields');
            if (e.target.value === 'fixed') {
                paramsFields.innerHTML = `
                    <div>
                        <label for="fixed-size" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tamaño de la muestra</label>
                        <input id="fixed-size" type="number" value="${Math.min(100, state.fileInfo.totalRows)}" min="1" max="${state.fileInfo.totalRows}" class="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                `;
            } else {
                paramsFields.innerHTML = `
                    <div>
                        <label for="confidence" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nivel de Confianza</label>
                        <select id="confidence" class="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md focus:ring-sky-500 focus:border-sky-500">
                            <option value="90">90%</option>
                            <option value="95" selected>95%</option>
                            <option value="99">99%</option>
                        </select>
                    </div>
                `;
            }
        }
        if (e.target.closest('#sampling-method-group')) {
            const labels = document.querySelectorAll('#sampling-method-group label');
            labels.forEach(label => {
                const radio = label.querySelector('input');
                if (radio.checked) {
                    label.classList.add('bg-sky-50', 'border-sky-500', 'dark:bg-sky-900/50', 'dark:border-sky-500');
                    label.classList.remove('bg-slate-50', 'dark:bg-slate-700/50', 'border-slate-300', 'dark:border-slate-600');
                } else {
                    label.classList.remove('bg-sky-50', 'border-sky-500', 'dark:bg-sky-900/50', 'dark:border-sky-500');
                    label.classList.add('bg-slate-50', 'dark:bg-slate-700/50', 'border-slate-300', 'dark:border-slate-600');
                }
            });
        }
    });

    appContainer.addEventListener('click', (e) => {
        if (e.target.closest('#generate-button')) handleGenerateSample();
        if (e.target.closest('#download-button')) handleDownload();
        if (e.target.closest('#reset-button')) handleReset();
    });

    // Drag and drop listeners
    appContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dropzone = document.getElementById('dropzone');
        if (dropzone) {
            dropzone.classList.add('border-sky-500', 'bg-sky-100', 'dark:bg-sky-900/50');
        }
    });
    appContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dropzone = document.getElementById('dropzone');
        if (dropzone) {
            dropzone.classList.remove('border-sky-500', 'bg-sky-100', 'dark:bg-sky-900/50');
        }
    });
    appContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dropzone = document.getElementById('dropzone');
        if (dropzone) {
            dropzone.classList.remove('border-sky-500', 'bg-sky-100', 'dark:bg-sky-900/50');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files[0]);
                e.dataTransfer.clearData();
            }
        }
    });
});
