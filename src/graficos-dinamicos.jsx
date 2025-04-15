import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import * as _ from 'lodash';

// Paleta de colores accesible para múltiples archivos
const CHART_COLORS = [
  '#2563eb', // Azul
  '#16a34a', // Verde
  '#ea580c', // Naranja
  '#dc2626', // Rojo
  '#9333ea', // Púrpura
  '#be123c', // Rosa
  '#0891b2', // Cyan
  '#eab308', // Amarillo
  '#4f46e5', // Índigo
  '#f97316', // Naranja claro
  '#84cc16', // Lima
  '#06b6d4', // Celeste
  '#ec4899', // Rosa claro
  '#8b5cf6', // Violeta
  '#14b8a6', // Turquesa
];

// Componente para la tabla de resumen de métricas
const MetricSummaryTable = ({ datasets, metric, title, unit = '', formatFunc = null }) => {
  if (!datasets || datasets.length === 0) return null;
  
  // Calcular estadísticas para cada dataset
  const summaryData = datasets.map(dataset => {
    const values = dataset.filteredData.map(item => item[metric]).filter(v => v !== undefined && v !== null);
    
    if (values.length === 0) {
      return {
        id: dataset.id,
        name: dataset.name,
        color: dataset.color,
        min: '-',
        max: '-',
        avg: '-'
      };
    }
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Formatear valores si se proporciona una función de formato
    const format = (value) => {
      if (formatFunc) return formatFunc(value);
      return `${parseFloat(value.toFixed(2))}${unit}`;
    };
    
    return {
      id: dataset.id,
      name: dataset.name,
      color: dataset.color,
      min: format(min),
      max: format(max),
      avg: format(avg)
    };
  });
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archivo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mínimo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máximo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promedio</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {summaryData.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{item.min}</td>
                <td className="px-4 py-3 whitespace-nowrap">{item.max}</td>
                <td className="px-4 py-3 whitespace-nowrap">{item.avg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Componente principal
const GraficosRendimiento = () => {
  const [datasets, setDatasets] = useState([]); // Array de datasets
  const [loading, setLoading] = useState(false);
  const [filteredDatasets, setFilteredDatasets] = useState([]); // Datasets filtrados por tiempo
  const [combinedData, setCombinedData] = useState([]);
  const [timeRange, setTimeRange] = useState(60); // Mostrar los últimos X segundos
  const [fileName, setFileName] = useState(''); // Estado para el nombre del archivo
  
  const fileInputRef = useRef(null); // Referencia para limpiar el input de archivo
  
  useEffect(() => {
    if (datasets.length > 0) {
      updateFilteredData(datasets, timeRange);
    }
  }, [timeRange, datasets]);
  
  // Manejo de carga de archivos
  const handleAddFile = (e) => {
    setLoading(true);
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const result = Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        
        // Asignar un color del pool de colores
        const colorIndex = datasets.length % CHART_COLORS.length;
        const color = CHART_COLORS[colorIndex];
        
        // Usar el nombre personalizado si está disponible, o el nombre del archivo
        const displayName = fileName.trim() || file.name;
        
        const processedData = processDatos(result.data, datasets.length);
        
        setDatasets(prev => [...prev, {
          id: datasets.length,
          name: displayName,
          color: color,
          data: processedData.data,
          stats: processedData.stats
        }]);
        
        // Limpiar el input de archivo y el nombre
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setFileName('');
        setLoading(false);
      };
      reader.readAsText(file);
    }
  };
  
  // Eliminar un dataset
  const removeDataset = (index) => {
    setDatasets(prev => {
      const newDatasets = prev.filter(dataset => dataset.id !== index);
      // Recalcular datos combinados
      if (newDatasets.length > 0) {
        updateFilteredData(newDatasets, timeRange);
      } else {
        setCombinedData([]);
        setFilteredDatasets([]);
      }
      return newDatasets;
    });
  };
  
  // Procesar datos del CSV
  const processDatos = (rawData, datasetId) => {
    const groupedBySecond = _.groupBy(rawData, 'fecha_ejecucion');

    const promediosPorSegundo = Object.entries(groupedBySecond).map(([segundo, peticiones]) => {
      const promedio = {
        fecha_ejecucion: segundo,
        tp_ejec: calcularPromedio(peticiones, 'tp_ejec'),
        tp_resp: calcularPromedio(peticiones, 'tp_resp'),
        cpu_uso: calcularPromedio(peticiones, 'cpu_uso'),
        ram_uso: calcularPromedio(peticiones, 'ram_uso'),
        usuarios: calcularModa(peticiones, 'usuarios'),
        latencia: calcularPromedio(peticiones, 'latencia'),
        peticiones_seg: calcularPromedio(peticiones, 'peticiones_seg'),
        estado: calcularModa(peticiones, 'estado'),
        success: calcularModaBooleana(peticiones, 'success'),
        metodo: calcularModa(peticiones, 'metodo'),
        endpoint: calcularModa(peticiones, 'endpoint'),
        num_peticiones: peticiones.length,
        datasetId: datasetId
      };

      const fecha = new Date(segundo);
      promedio.hora = fecha.toTimeString().substring(0, 8);
      promedio.label = segundo.substring(segundo.length - 5);

      return promedio;
    });

    const datosOrdenados = _.sortBy(promediosPorSegundo, 'fecha_ejecucion');

    const stats = {
      totalSegundos: datosOrdenados.length,
      promedioPeticionesPorSegundo: Math.round(datosOrdenados.reduce((sum, item) => sum + item.num_peticiones, 0) / Math.max(1, datosOrdenados.length)),
      maxPeticionesPorSegundo: Math.max(...datosOrdenados.map(item => item.num_peticiones)),
      minPeticionesPorSegundo: Math.min(...datosOrdenados.map(item => item.num_peticiones)),
      promedioTiempoEjecucion: Math.round(datosOrdenados.reduce((sum, item) => sum + item.tp_ejec, 0) / Math.max(1, datosOrdenados.length)),
      maxTiempoEjecucion: Math.max(...datosOrdenados.map(item => item.tp_ejec)),
      minTiempoEjecucion: Math.min(...datosOrdenados.map(item => item.tp_ejec)),
      promedioTiempoRespuesta: Math.round(datosOrdenados.reduce((sum, item) => sum + item.tp_resp, 0) / Math.max(1, datosOrdenados.length)),
      maxTiempoRespuesta: Math.max(...datosOrdenados.map(item => item.tp_resp)),
      minTiempoRespuesta: Math.min(...datosOrdenados.map(item => item.tp_resp)),
      promedioCPU: parseFloat((datosOrdenados.reduce((sum, item) => sum + item.cpu_uso, 0) / Math.max(1, datosOrdenados.length)).toFixed(2)),
      maxCPU: Math.max(...datosOrdenados.map(item => item.cpu_uso)),
      minCPU: Math.min(...datosOrdenados.map(item => item.cpu_uso)),
      promedioRAM: parseFloat((datosOrdenados.reduce((sum, item) => sum + item.ram_uso, 0) / Math.max(1, datosOrdenados.length)).toFixed(2)),
      maxRAM: Math.max(...datosOrdenados.map(item => item.ram_uso)),
      minRAM: Math.min(...datosOrdenados.map(item => item.ram_uso)),
      promedioLatencia: parseFloat((datosOrdenados.reduce((sum, item) => sum + item.latencia, 0) / Math.max(1, datosOrdenados.length)).toFixed(2)),
      maxLatencia: Math.max(...datosOrdenados.map(item => item.latencia)),
      minLatencia: Math.min(...datosOrdenados.map(item => item.latencia))
    };
    
    return {
      data: datosOrdenados,
      stats: stats
    };
  };
  
  // Actualizar datos filtrados basados en el rango de tiempo
  const updateFilteredData = (allDatasets, range) => {
    // Filtrar cada dataset para mostrar solo los últimos 'range' segundos
    const filtered = allDatasets.map(dataset => {
      const dataLength = dataset.data.length;
      return {
        ...dataset,
        filteredData: dataLength <= range ? 
          dataset.data : 
          dataset.data.slice(Math.max(0, dataLength - range))
      };
    });
    
    setFilteredDatasets(filtered);
    
    // Generar datos combinados para los gráficos
    const combined = [];
    
    // Crear un conjunto de todas las etiquetas (marcas de tiempo) únicas
    const allLabels = new Set();
    filtered.forEach(dataset => {
      dataset.filteredData.forEach(item => {
        allLabels.add(item.label);
      });
    });
    
    // Ordenar las etiquetas para asegurar orden cronológico
    const sortedLabels = Array.from(allLabels).sort();
    
    // Para cada marca de tiempo, recopilar datos de todos los datasets
    sortedLabels.forEach(label => {
      const dataPoint = {
        label
      };
      
      // Agregar datos de cada dataset para esta marca de tiempo
      filtered.forEach(dataset => {
        const item = dataset.filteredData.find(item => item.label === label) || {};
        
        dataPoint[`tp_ejec_${dataset.id}`] = item.tp_ejec || 0;
        dataPoint[`tp_resp_${dataset.id}`] = item.tp_resp || 0;
        dataPoint[`cpu_uso_${dataset.id}`] = item.cpu_uso || 0;
        dataPoint[`ram_uso_${dataset.id}`] = item.ram_uso || 0;
        dataPoint[`latencia_${dataset.id}`] = item.latencia || 0;
        dataPoint[`num_peticiones_${dataset.id}`] = item.num_peticiones || 0;
        dataPoint[`hora_${dataset.id}`] = item.hora || '';
        dataPoint[`endpoint_${dataset.id}`] = item.endpoint || '';
      });
      
      combined.push(dataPoint);
    });
    
    setCombinedData(combined);
  };
  
  // Funciones de cálculo para el procesamiento de datos
  const calcularPromedio = (datos, campo) => {
    const valores = datos.map(row => row[campo]).filter(val => val !== null && val !== undefined && !isNaN(val));
    if (valores.length === 0) return 0;
    
    const suma = valores.reduce((acc, val) => acc + val, 0);
    return parseFloat((suma / valores.length).toFixed(2));
  };
  
  const calcularModa = (datos, campo) => {
    const valores = datos.map(row => row[campo]);
    const conteo = _.countBy(valores);
    const pares = Object.entries(conteo);
    const [valor] = _.maxBy(pares, ([, count]) => count) || [null];
    return valor;
  };
  
  const calcularModaBooleana = (datos, campo) => {
    const valores = datos.map(row => {
      if (typeof row[campo] === 'string') {
        return row[campo].toLowerCase() === 'true';
      }
      return !!row[campo];
    });
    
    const contadorTrue = valores.filter(val => val === true).length;
    return contadorTrue / valores.length > 0.5;
  };
  
  // Renderizar los indicadores de leyenda para cada dataset
  const renderLegend = (datasets) => {
    if (!datasets || datasets.length === 0) return null;
    
    return (
      <div className="flex flex-wrap justify-end mb-4">
        {datasets.map((dataset) => (
          <div key={dataset.id} className="flex items-center mr-4 mb-2">
            <div 
              className="w-3 h-3 rounded-full mr-1"
              style={{ backgroundColor: dataset.color }}
            ></div>
            <span className="text-sm text-gray-700">{dataset.name}</span>
          </div>
        ))}
      </div>
    );
  };
  
  // Spinner de carga mejorado
  if (loading && datasets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Análisis Comparativo de Rendimiento</h1>
        
        {/* Sección de carga de archivos */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Agregar Archivos CSV</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="file-name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre para el archivo (opcional)
              </label>
              <input
                id="file-name"
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Prueba A - 500 usuarios"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar archivo CSV
              </label>
              <input
                id="csv-file"
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleAddFile}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
          
          {loading && (
            <div className="flex items-center justify-center p-4 mb-4 bg-blue-50 rounded-lg">
              <div className="w-6 h-6 border-2 border-t-blue-500 border-blue-200 rounded-full animate-spin mr-3"></div>
              <p className="text-blue-700">Cargando archivo...</p>
            </div>
          )}
          
          {/* Lista de archivos cargados */}
          {datasets.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4 text-gray-600">Archivos Cargados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {datasets.map((dataset) => (
                  <div 
                    key={dataset.id} 
                    className="p-5 rounded-lg shadow-md border border-gray-100"
                    style={{ 
                      backgroundColor: `${dataset.color}10`, 
                      borderLeft: `4px solid ${dataset.color}` 
                    }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ backgroundColor: dataset.color }}
                        ></div>
                        <h4 className="font-medium text-gray-800">{dataset.name}</h4>
                      </div>
                      <button 
                        onClick={() => removeDataset(dataset.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"
                        aria-label={`Eliminar ${dataset.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Peticiones/s:</span>
                        <span className="font-semibold text-gray-800">{dataset.stats.promedioPeticionesPorSegundo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">T. Ejecución:</span>
                        <span className="font-semibold text-gray-800">{dataset.stats.promedioTiempoEjecucion} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CPU:</span>
                        <span className="font-semibold text-gray-800">{dataset.stats.promedioCPU}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">RAM:</span>
                        <span className="font-semibold text-gray-800">{dataset.stats.promedioRAM}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Latencia:</span>
                        <span className="font-semibold text-gray-800">{dataset.stats.promedioLatencia} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Segundos:</span>
                        <span className="font-semibold text-gray-800">{dataset.stats.totalSegundos}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {datasets.length > 0 && (
          <>
            {/* Panel comparativo de estadísticas generales */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-xl font-semibold mb-6 text-gray-700">Comparativa General</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archivo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peticiones/s</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T. Ejecución</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T. Respuesta</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RAM %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latencia</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {datasets.map((dataset, index) => (
                      <tr key={dataset.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <span 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: dataset.color }}
                            ></span>
                            <span className="font-medium text-gray-800">{dataset.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-gray-800">{dataset.stats.promedioPeticionesPorSegundo}</div>
                          <div className="text-xs text-gray-500">
                            (min: {dataset.stats.minPeticionesPorSegundo}, max: {dataset.stats.maxPeticionesPorSegundo})
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-gray-800">{dataset.stats.promedioTiempoEjecucion} ms</div>
                          <div className="text-xs text-gray-500">
                            (min: {dataset.stats.minTiempoEjecucion}, max: {dataset.stats.maxTiempoEjecucion})
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-gray-800">{dataset.stats.promedioTiempoRespuesta} ms</div>
                          <div className="text-xs text-gray-500">
                            (min: {dataset.stats.minTiempoRespuesta}, max: {dataset.stats.maxTiempoRespuesta})
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-gray-800">{dataset.stats.promedioCPU}%</div>
                          <div className="text-xs text-gray-500">
                            (min: {dataset.stats.minCPU.toFixed(1)}%, max: {dataset.stats.maxCPU.toFixed(1)}%)
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-gray-800">{dataset.stats.promedioRAM}%</div>
                          <div className="text-xs text-gray-500">
                            (min: {dataset.stats.minRAM.toFixed(1)}%, max: {dataset.stats.maxRAM.toFixed(1)}%)
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-gray-800">{dataset.stats.promedioLatencia} ms</div>
                          <div className="text-xs text-gray-500">
                            (min: {dataset.stats.minLatencia.toFixed(1)}, max: {dataset.stats.maxLatencia.toFixed(1)})
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Controles de rango de tiempo */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4 md:mb-0">Gráficos Comparativos</h2>
              <div className="inline-flex items-center p-1 bg-gray-100 rounded-lg">
                <button 
                  onClick={() => setTimeRange(30)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeRange === 30 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  30s
                </button>
                <button 
                  onClick={() => setTimeRange(60)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeRange === 60 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  60s
                </button>
                <button 
                  onClick={() => setTimeRange(120)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeRange === 120 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  120s
                </button>
                <button 
                  onClick={() => setTimeRange(Math.max(...datasets.map(d => d.data.length)))}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeRange === Math.max(...datasets.map(d => d.data.length)) 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todo
                </button>
              </div>
            </div>

            {/* Tablas de resumen de métricas */}
            <MetricSummaryTable 
              datasets={filteredDatasets} 
              metric="num_peticiones" 
              title="Resumen: Peticiones por Segundo" 
            />
            
            {/* Gráfico Peticiones por Segundo */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Peticiones por Segundo</h3>
              {renderLegend(filteredDatasets)}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#4a5568' }}
                      axisLine={{ stroke: '#cbd5e0' }}
                    />
                    <YAxis 
                      tick={{ fill: '#4a5568' }}
                      axisLine={{ stroke: '#cbd5e0' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        const datasetId = name.split('_').pop();
                        const dataset = datasets.find(d => d.id === parseInt(datasetId));
                        return [value, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{ 
                        borderRadius: '6px', 
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' 
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Bar 
                        key={dataset.id}
                        dataKey={`num_peticiones_${dataset.id}`} 
                        fill={dataset.color} 
                        name={`Peticiones_${dataset.id}`}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <MetricSummaryTable 
              datasets={filteredDatasets} 
              metric="tp_ejec" 
              title="Resumen: Tiempo de Ejecución (ms)" 
              unit=" ms" 
            />
            
            {/* Gráfico Tiempo de Ejecución */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Tiempo de Ejecución (ms)</h3>
              {renderLegend(filteredDatasets)}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#4a5568' }}
                      axisLine={{ stroke: '#cbd5e0' }}
                    />
                    <YAxis 
                      tick={{ fill: '#4a5568' }}
                      axisLine={{ stroke: '#cbd5e0' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        const datasetId = name.split('_').pop();
                        const dataset = datasets.find(d => d.id === parseInt(datasetId));
                        return [`${value} ms`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{ 
                        borderRadius: '6px', 
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' 
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line 
                        key={dataset.id}
                        type="monotone" 
                        dataKey={`tp_ejec_${dataset.id}`} 
                        stroke={dataset.color} 
                        name={`T. Ejecución_${dataset.id}`}
                        strokeWidth={2}
                        dot={{ r: 3, fill: dataset.color, strokeWidth: 0 }}
                        activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <MetricSummaryTable 
              datasets={filteredDatasets} 
              metric="tp_resp" 
              title="Resumen: Tiempo de Respuesta (ms)" 
              unit=" ms" 
            />
            
            {/* Gráfico Tiempo de Respuesta */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Tiempo de Respuesta (ms)</h3>
              {renderLegend(filteredDatasets)}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#4a5568' }}
                      axisLine={{ stroke: '#cbd5e0' }}
                    />
                    <YAxis 
                      tick={{ fill: '#4a5568' }}
                      axisLine={{ stroke: '#cbd5e0' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        const datasetId = name.split('_').pop();
                        const dataset = datasets.find(d => d.id === parseInt(datasetId));
                        return [`${value} ms`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{ 
                        borderRadius: '6px', 
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' 
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line 
                        key={dataset.id}
                        type="monotone" 
                        dataKey={`tp_resp_${dataset.id}`} 
                        stroke={dataset.color} 
                        name={`T. Respuesta_${dataset.id}`}
                        strokeWidth={2}
                        dot={{ r: 3, fill: dataset.color, strokeWidth: 0 }}
                        activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <MetricSummaryTable 
              datasets={filteredDatasets} 
              metric="cpu_uso" 
              title="Resumen: CPU Uso (%)" 
              unit="%" 
            />
            
            {/* Gráfico Uso CPU */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">CPU Uso (%)</h3>
              {renderLegend(filteredDatasets)}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#4a5568' }}
                      axisLine={{ stroke: '#cbd5e0' }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fill: '#4a5568' }}
                      axisLine={{ stroke: '#cbd5e0' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        const datasetId = name.split('_').pop();
                        const dataset = datasets.find(d => d.id === parseInt(datasetId));
                        return [`${value}%`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{ 
                        borderRadius: '6px', 
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' 
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line 
                        key={dataset.id}
                        type="monotone" 
                        dataKey={`cpu_uso_${dataset.id}`} 
                        stroke={dataset.color} 
                        name={`CPU_${dataset.id}`}
                        strokeWidth={2}
                        dot={{ r: 3, fill: dataset.color, strokeWidth: 0 }}
                        activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <MetricSummaryTable 
              datasets={filteredDatasets} 
              metric="ram_uso" 
              title="Resumen: RAM Uso (%)" 
              unit="%" 
            />
            
            {/* Gráfico Uso RAM */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">RAM Uso (%)</h3>
              {renderLegend(filteredDatasets)}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#4a5568' }}
                      axisLine={{ stroke: '#cbd5e0' }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fill: '#4a5568' }}
                      axisLine={{ stroke: '#cbd5e0' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        const datasetId = name.split('_').pop();
                        const dataset = datasets.find(d => d.id === parseInt(datasetId));
                        return [`${value}%`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{ 
                        borderRadius: '6px', 
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' 
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line 
                        key={dataset.id}
                        type="monotone" 
                        dataKey={`ram_uso_${dataset.id}`} 
                        stroke={dataset.color} 
                        name={`RAM_${dataset.id}`}
                        strokeWidth={2}
                        dot={{ r: 3, fill: dataset.color, strokeWidth: 0 }}
                        activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <MetricSummaryTable 
              datasets={filteredDatasets} 
              metric="latencia" 
              title="Resumen: Latencia (ms)" 
              unit=" ms" 
            />
            
            {/* Gráfico Latencia */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Latencia (ms)</h3>
              {renderLegend(filteredDatasets)}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#4a5568' }}
                      axisLine={{ stroke: '#cbd5e0' }}
                    />
                    <YAxis 
                      tick={{ fill: '#4a5568' }}
                      axisLine={{ stroke: '#cbd5e0' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        const datasetId = name.split('_').pop();
                        const dataset = datasets.find(d => d.id === parseInt(datasetId));
                        return [`${value} ms`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{ 
                        borderRadius: '6px', 
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' 
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line 
                        key={dataset.id}
                        type="monotone" 
                        dataKey={`latencia_${dataset.id}`} 
                        stroke={dataset.color} 
                        name={`Latencia_${dataset.id}`}
                        strokeWidth={2}
                        dot={{ r: 3, fill: dataset.color, strokeWidth: 0 }}
                        activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Datos recientes para cada dataset */}
            <h2 className="text-xl font-semibold mb-6 text-gray-700">Datos Recientes</h2>
            <div className="grid grid-cols-1 gap-6 mb-8">
              {filteredDatasets.map((dataset) => (
                <div 
                  key={dataset.id} 
                  className="bg-white p-6 rounded-lg shadow-md overflow-x-auto"
                  style={{ borderLeft: `4px solid ${dataset.color}` }}
                >
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">
                    <div className="flex items-center">
                      <span 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: dataset.color }}
                      ></span>
                      {dataset.name} - Últimos registros
                    </div>
                  </h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Momento</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peticiones</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T. Ejec</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T. Resp</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU %</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RAM %</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latencia</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dataset.filteredData.slice(Math.max(0, dataset.filteredData.length - 5)).reverse().map((item, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="px-4 py-3 whitespace-nowrap font-medium">{item.hora}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{item.num_peticiones}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{item.tp_ejec} ms</td>
                          <td className="px-4 py-3 whitespace-nowrap">{item.tp_resp} ms</td>
                          <td className="px-4 py-3 whitespace-nowrap">{item.cpu_uso}%</td>
                          <td className="px-4 py-3 whitespace-nowrap">{item.ram_uso}%</td>
                          <td className="px-4 py-3 whitespace-nowrap">{item.latencia} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GraficosRendimiento;