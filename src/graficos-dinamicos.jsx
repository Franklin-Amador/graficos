// import React, { useState, useEffect } from 'react';
// import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// import Papa from 'papaparse';
// import * as _ from 'lodash';

// const GraficosRendimiento = () => {
//   const [datasets, setDatasets] = useState([]); // Array de datasets
//   const [loading, setLoading] = useState(false);
//   const [filteredDatasets, setFilteredDatasets] = useState([]); // Datasets filtrados por tiempo
//   const [combinedData, setCombinedData] = useState([]);
//   const [timeRange, setTimeRange] = useState(60); // Mostrar los últimos X segundos
//   const [colors] = useState([
//     '#2563EB', // azul intenso
//     '#16A34A', // verde intenso
//     '#EA580C', // naranja intenso
//     '#DC2626', // rojo intenso
//     '#7E22CE', // púrpura intenso
//     '#DB2777', // rosa intenso
//     '#0E7490', // teal intenso
//     '#CA8A04', // amarillo intenso
//     '#4338CA', // indigo intenso
//     '#E11D48', // rojo cereza
//     '#059669', // esmeralda
//     '#0369A1', // azul marino
//   ]);
  
//   useEffect(() => {
//     if (datasets.length > 0) {
//       updateFilteredData(datasets, timeRange);
//     }
//   }, [timeRange, datasets]);
  
//   const handleAddFile = (e) => {
//     setLoading(true);
//     const file = e.target.files[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         const text = e.target.result;
//         const result = Papa.parse(text, {
//           header: true,
//           dynamicTyping: true,
//           skipEmptyLines: true
//         });
        
//         // Asignar un color del pool de colores
//         const colorIndex = datasets.length % colors.length;
//         const color = colors[colorIndex];
        
//         const processedData = processDatos(result.data, datasets.length);
        
//         setDatasets(prev => [...prev, {
//           id: datasets.length,
//           name: file.name,
//           color: color,
//           data: processedData.data,
//           stats: processedData.stats
//         }]);
        
//         setLoading(false);
//       };
//       reader.readAsText(file);
//     }
//   };
  
//   const removeDataset = (index) => {
//     setDatasets(prev => {
//       const newDatasets = prev.filter(dataset => dataset.id !== index);
//       // Recalcular datos combinados
//       if (newDatasets.length > 0) {
//         updateFilteredData(newDatasets, timeRange);
//       } else {
//         setCombinedData([]);
//         setFilteredDatasets([]);
//       }
//       return newDatasets;
//     });
//   };
  
//   const processDatos = (rawData, datasetId) => {
//     const groupedBySecond = _.groupBy(rawData, 'fecha_ejecucion');

//     const promediosPorSegundo = Object.entries(groupedBySecond).map(([segundo, peticiones]) => {
//       const promedio = {
//         fecha_ejecucion: segundo,
//         tp_ejec: calcularPromedio(peticiones, 'tp_ejec'),
//         tp_resp: calcularPromedio(peticiones, 'tp_resp'),
//         cpu_uso: calcularPromedio(peticiones, 'cpu_uso'),
//         ram_uso: calcularPromedio(peticiones, 'ram_uso'),
//         usuarios: calcularModa(peticiones, 'usuarios'),
//         latencia: calcularPromedio(peticiones, 'latencia'),
//         peticiones_seg: calcularPromedio(peticiones, 'peticiones_seg'),
//         estado: calcularModa(peticiones, 'estado'),
//         success: calcularModaBooleana(peticiones, 'success'),
//         metodo: calcularModa(peticiones, 'metodo'),
//         endpoint: calcularModa(peticiones, 'endpoint'),
//         num_peticiones: peticiones.length,
//         datasetId: datasetId
//       };

//       const fecha = new Date(segundo);
//       promedio.hora = fecha.toTimeString().substring(0, 8);
//       promedio.label = segundo.substring(segundo.length - 5);

//       return promedio;
//     });

//     const datosOrdenados = _.sortBy(promediosPorSegundo, 'fecha_ejecucion');

//     const stats = {
//       totalSegundos: datosOrdenados.length,
//       promedioPeticionesPorSegundo: Math.round(datosOrdenados.reduce((sum, item) => sum + item.num_peticiones, 0) / datosOrdenados.length),
//       maxPeticionesPorSegundo: Math.max(...datosOrdenados.map(item => item.num_peticiones)),
//       minPeticionesPorSegundo: Math.min(...datosOrdenados.map(item => item.num_peticiones)),
//       promedioTiempoEjecucion: Math.round(datosOrdenados.reduce((sum, item) => sum + item.tp_ejec, 0) / datosOrdenados.length),
//       promedioTiempoRespuesta: Math.round(datosOrdenados.reduce((sum, item) => sum + item.tp_resp, 0) / datosOrdenados.length),
//       promedioCPU: (datosOrdenados.reduce((sum, item) => sum + item.cpu_uso, 0) / datosOrdenados.length).toFixed(2),
//       promedioRAM: (datosOrdenados.reduce((sum, item) => sum + item.ram_uso, 0) / datosOrdenados.length).toFixed(2),
//       promedioLatencia: (datosOrdenados.reduce((sum, item) => sum + item.latencia, 0) / datosOrdenados.length).toFixed(2)
//     };
    
//     return {
//       data: datosOrdenados,
//       stats: stats
//     };
//   };
  
//   const updateFilteredData = (allDatasets, range) => {
//     // Filtrar cada dataset para mostrar solo los últimos 'range' segundos
//     const filtered = allDatasets.map(dataset => {
//       const dataLength = dataset.data.length;
//       return {
//         ...dataset,
//         filteredData: dataLength <= range ? 
//           dataset.data : 
//           dataset.data.slice(Math.max(0, dataLength - range))
//       };
//     });
    
//     setFilteredDatasets(filtered);
    
//     // Generar datos combinados para los gráficos
//     const combined = [];
    
//     // Crear un conjunto de todas las etiquetas (marcas de tiempo) únicas
//     const allLabels = new Set();
//     filtered.forEach(dataset => {
//       dataset.filteredData.forEach(item => {
//         allLabels.add(item.label);
//       });
//     });
    
//     // Ordenar las etiquetas para asegurar orden cronológico
//     const sortedLabels = Array.from(allLabels).sort();
    
//     // Para cada marca de tiempo, recopilar datos de todos los datasets
//     sortedLabels.forEach(label => {
//       const dataPoint = {
//         label
//       };
      
//       // Agregar datos de cada dataset para esta marca de tiempo
//       filtered.forEach(dataset => {
//         const item = dataset.filteredData.find(item => item.label === label) || {};
        
//         dataPoint[`tp_ejec_${dataset.id}`] = item.tp_ejec || 0;
//         dataPoint[`tp_resp_${dataset.id}`] = item.tp_resp || 0;
//         dataPoint[`cpu_uso_${dataset.id}`] = item.cpu_uso || 0;
//         dataPoint[`ram_uso_${dataset.id}`] = item.ram_uso || 0;
//         dataPoint[`latencia_${dataset.id}`] = item.latencia || 0;
//         dataPoint[`num_peticiones_${dataset.id}`] = item.num_peticiones || 0;
//         dataPoint[`hora_${dataset.id}`] = item.hora || '';
//         dataPoint[`endpoint_${dataset.id}`] = item.endpoint || '';
//       });
      
//       combined.push(dataPoint);
//     });
    
//     setCombinedData(combined);
//   };
  
//   const calcularPromedio = (datos, campo) => {
//     const valores = datos.map(row => row[campo]).filter(val => val !== null && val !== undefined && !isNaN(val));
//     if (valores.length === 0) return 0;
    
//     const suma = valores.reduce((acc, val) => acc + val, 0);
//     return parseFloat((suma / valores.length).toFixed(2));
//   };
  
//   const calcularModa = (datos, campo) => {
//     const valores = datos.map(row => row[campo]);
//     const conteo = _.countBy(valores);
//     const pares = Object.entries(conteo);
//     const [valor] = _.maxBy(pares, ([, count]) => count) || [null];
//     return valor;
//   };
  
//   const calcularModaBooleana = (datos, campo) => {
//     const valores = datos.map(row => {
//       if (typeof row[campo] === 'string') {
//         return row[campo].toLowerCase() === 'true';
//       }
//       return !!row[campo];
//     });
    
//     const contadorTrue = valores.filter(val => val === true).length;
//     return contadorTrue / valores.length > 0.5;
//   };
  
//   // Crear una tabla de promedios para una métrica específica en todos los datasets
//   const renderAveragesTable = (metric, title, unit = '') => {
//     if (filteredDatasets.length === 0) return null;
    
//     // Calcular promedio para cada dataset en el período de tiempo filtrado
//     const averages = filteredDatasets.map(dataset => {
//       const values = dataset.filteredData.map(item => item[metric]);
//       const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
//       return {
//         id: dataset.id,
//         name: dataset.name,
//         color: dataset.color,
//         average: parseFloat(avg.toFixed(2))
//       };
//     });
    
//     // Ordenar por promedio descendente
//     const sortedAverages = [...averages].sort((a, b) => b.average - a.average);
    
//     return (
//       <div className="bg-white p-12 rounded-lg shadow-lg border border-gray-200 overflow-hidden">
//         <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">{title} - Promedios</h3>
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200 border">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Archivo</th>
//                 <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Promedio</th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {sortedAverages.map((item, index) => (
//                 <tr key={index} 
//                     className="hover:bg-gray-50 transition-colors duration-200"
//                     style={{ backgroundColor: index % 2 === 0 ? `${item.color}15` : 'white' }}>
//                   <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
//                     <div className="flex items-center">
//                       <span className="inline-block w-4 h-4 mr-3 rounded-sm border border-gray-300" 
//                             style={{ backgroundColor: item.color }}></span>
//                       <span className="font-medium">{item.name}</span>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap font-bold" style={{ color: item.color }}>
//                     {item.average}{unit}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     );
//   };
  
//   if (loading && datasets.length === 0) {
//     return <div className="p-4 text-center">Cargando datos...</div>;
//   }

//   return (
//     <div className="max-w-7xl mx-auto m-12 py-8 bg-gray-100 min-h-screen">
//       <h1 className="text-3xl font-bold mb-8 text-center text-gray-800 border-b-4 border-blue-600 pb-4 max-w-3xl mx-auto">Análisis Comparativo de Rendimiento</h1>
      
//       <div className="mb-8 bg-white p-6 rounded-lg shadow-lg border border-gray-200">
//         <h2 className="text-xl font-bold mb-6 text-gray-800 border-l-4 border-blue-600 pl-3">Agregar Archivos CSV</h2>
//         <div className="flex flex-wrap items-center">
//           <label className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition cursor-pointer mb-4 mr-4">
//             <span>Seleccionar archivo CSV</span>
//             <input 
//               type="file" 
//               accept=".csv" 
//               onChange={handleAddFile} 
//               className="hidden"
//               disabled={loading}
//             />
//           </label>
//         </div>
        
//         {datasets.length > 0 && (
//           <div className="mt-8">
//             <h3 className="text-lg font-semibold mb-4 text-gray-800 border-l-4 border-green-600 pl-3">Archivos Cargados</h3>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//               {datasets.map((dataset, index) => (
//                 <div key={index} className="p-5 rounded-lg shadow-lg border-2" 
//                      style={{ 
//                        backgroundColor: `${dataset.color}10`, 
//                        borderColor: dataset.color 
//                      }}>
//                   <div className="flex justify-between items-center mb-3">
//                     <div className="font-bold text-gray-800 flex items-center">
//                       <div className="w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: dataset.color }}></div>
//                       {dataset.name}
//                     </div>
//                     <button 
//                       onClick={() => removeDataset(dataset.id)}
//                       className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition"
//                     >
//                       ×
//                     </button>
//                   </div>
//                   <div className="mt-3 grid grid-cols-2 gap-4 text-sm bg-white p-3 rounded-lg border border-gray-200">
//                     <div className="py-1">Peticiones/s: <span className="font-bold text-gray-800">{dataset.stats.promedioPeticionesPorSegundo}</span></div>
//                     <div className="py-1">T. Ejecución: <span className="font-bold text-gray-800">{dataset.stats.promedioTiempoEjecucion} ms</span></div>
//                     <div className="py-1">CPU: <span className="font-bold text-gray-800">{dataset.stats.promedioCPU}%</span></div>
//                     <div className="py-1">RAM: <span className="font-bold text-gray-800">{dataset.stats.promedioRAM}%</span></div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
      
//       {datasets.length > 0 && (
//         <>
//           <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-lg shadow-lg border border-gray-200">
//             <h2 className="text-xl font-bold mb-4 md:mb-0 text-gray-800 border-l-4 border-purple-600 pl-3">Gráficos Comparativos</h2>
//             <div className="flex gap-3">
//               <button 
//                 onClick={() => setTimeRange(30)}
//                 className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${timeRange === 30 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
//               >
//                 30s
//               </button>
//               <button 
//                 onClick={() => setTimeRange(60)}
//                 className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${timeRange === 60 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
//               >
//                 60s
//               </button>
//               <button 
//                 onClick={() => setTimeRange(120)}
//                 className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${timeRange === 120 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
//               >
//                 120s
//               </button>
//               <button 
//                 onClick={() => setTimeRange(Math.max(...datasets.map(d => d.data.length)))}
//                 className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${timeRange === Math.max(...datasets.map(d => d.data.length)) ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
//               >
//                 Todo
//               </button>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
//             {/* Gráfico Peticiones por Segundo */}
//             <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
//               <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">Peticiones por Segundo</h3>
//               <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
//                 {filteredDatasets.map((dataset, index) => (
//                   <span key={index} className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200">
//                     <span className="inline-block w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: dataset.color }}></span> 
//                     {dataset.name}
//                   </span>
//                 ))}
//               </div>
//               <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
//                 <ResponsiveContainer width="100%" height={300}>
//                   <BarChart data={combinedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
//                     <XAxis dataKey="label" tick={{ fill: '#4b5563' }} />
//                     <YAxis tick={{ fill: '#4b5563' }} />
//                     <Tooltip 
//                       formatter={(value, name) => {
//                         const datasetId = name.split('_').pop();
//                         const dataset = datasets.find(d => d.id === parseInt(datasetId));
//                         return [value, dataset ? dataset.name : name];
//                       }}
//                       labelFormatter={(label) => `Segundo: ${label}`}
//                       contentStyle={{ 
//                         backgroundColor: 'rgba(255, 255, 255, 0.95)', 
//                         border: '1px solid #e5e7eb',
//                         borderRadius: '6px',
//                         boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
//                       }}
//                     />
//                     <Legend content={() => null} />
//                     {filteredDatasets.map((dataset) => (
//                       <Bar 
//                         key={dataset.id}
//                         dataKey={`num_peticiones_${dataset.id}`} 
//                         fill={dataset.color} 
//                         name={`Peticiones_${dataset.id}`}
//                         radius={[4, 4, 0, 0]}
//                       />
//                     ))}
//                   </BarChart>
//                 </ResponsiveContainer>
//               </div>
//             </div>
            
//             {/* Gráfico Tiempo de Ejecución */}
//             <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
//               <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">Tiempo de Ejecución</h3>
//               <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
//                 {filteredDatasets.map((dataset, index) => (
//                   <span key={index} className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200">
//                     <span className="inline-block w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: dataset.color }}></span> 
//                     {dataset.name}
//                   </span>
//                 ))}
//               </div>
//               <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
//                 <ResponsiveContainer width="100%" height={300}>
//                   <LineChart data={combinedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
//                     <XAxis dataKey="label" tick={{ fill: '#4b5563' }} />
//                     <YAxis tick={{ fill: '#4b5563' }} />
//                     <Tooltip 
//                       formatter={(value, name) => {
//                         const datasetId = name.split('_').pop();
//                         const dataset = datasets.find(d => d.id === parseInt(datasetId));
//                         return [`${value} ms`, dataset ? dataset.name : name];
//                       }}
//                       labelFormatter={(label) => `Segundo: ${label}`}
//                       contentStyle={{ 
//                         backgroundColor: 'rgba(255, 255, 255, 0.95)', 
//                         border: '1px solid #e5e7eb',
//                         borderRadius: '6px',
//                         boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
//                       }}
//                     />
//                     <Legend content={() => null} />
//                     {filteredDatasets.map((dataset) => (
//                       <Line 
//                         key={dataset.id}
//                         type="monotone" 
//                         dataKey={`tp_ejec_${dataset.id}`} 
//                         stroke={dataset.color} 
//                         strokeWidth={2}
//                         dot={{ fill: dataset.color, strokeWidth: 1, r: 4 }}
//                         activeDot={{ r: 6, strokeWidth: 0 }}
//                         name={`T. Ejecución_${dataset.id}`} 
//                       />
//                     ))}
//                   </LineChart>
//                 </ResponsiveContainer>
//               </div>
//             </div>
            
//             {/* Gráfico Tiempo de Respuesta */}
//             <div className="bg-white p-4 rounded shadow">
//               <h3 className="text-md font-semibold mb-4">Tiempo de Respuesta</h3>
//               <div className="flex justify-end mb-2 text-sm flex-wrap">
//                 {filteredDatasets.map((dataset, index) => (
//                   <span key={index} className="mr-4 mb-1">
//                     <span className="inline-block w-3 h-3 mr-1" style={{ backgroundColor: dataset.color }}></span> 
//                     {dataset.name}
//                   </span>
//                 ))}
//               </div>
//               <ResponsiveContainer width="100%" height={300}>
//                 <LineChart data={combinedData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="label" />
//                   <YAxis />
//                   <Tooltip 
//                     formatter={(value, name) => {
//                       const datasetId = name.split('_').pop();
//                       const dataset = datasets.find(d => d.id === parseInt(datasetId));
//                       return [`${value} ms`, dataset ? dataset.name : name];
//                     }}
//                     labelFormatter={(label) => `Segundo: ${label}`}
//                   />
//                   <Legend content={() => null} />
//                   {filteredDatasets.map((dataset) => (
//                     <Line 
//                       key={dataset.id}
//                       type="monotone" 
//                       dataKey={`tp_resp_${dataset.id}`} 
//                       stroke={dataset.color} 
//                       name={`T. Respuesta_${dataset.id}`} 
//                     />
//                   ))}
//                 </LineChart>
//               </ResponsiveContainer>
//             </div>
            
//             {/* Gráfico Uso CPU */}
//             <div className="bg-white p-4 rounded shadow">
//               <h3 className="text-md font-semibold mb-4">CPU Uso (%)</h3>
//               <div className="flex justify-end mb-2 text-sm flex-wrap">
//                 {filteredDatasets.map((dataset, index) => (
//                   <span key={index} className="mr-4 mb-1">
//                     <span className="inline-block w-3 h-3 mr-1" style={{ backgroundColor: dataset.color }}></span> 
//                     {dataset.name}
//                   </span>
//                 ))}
//               </div>
//               <ResponsiveContainer width="100%" height={300}>
//                 <LineChart data={combinedData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="label" />
//                   <YAxis domain={[0, 100]} />
//                   <Tooltip 
//                     formatter={(value, name) => {
//                       const datasetId = name.split('_').pop();
//                       const dataset = datasets.find(d => d.id === parseInt(datasetId));
//                       return [`${value}%`, dataset ? dataset.name : name];
//                     }}
//                     labelFormatter={(label) => `Segundo: ${label}`}
//                   />
//                   <Legend content={() => null} />
//                   {filteredDatasets.map((dataset) => (
//                     <Line 
//                       key={dataset.id}
//                       type="monotone" 
//                       dataKey={`cpu_uso_${dataset.id}`} 
//                       stroke={dataset.color} 
//                       name={`CPU_${dataset.id}`} 
//                     />
//                   ))}
//                 </LineChart>
//               </ResponsiveContainer>
//             </div>
            
//             {/* Gráfico Uso RAM */}
//             <div className="bg-white p-4 rounded shadow">
//               <h3 className="text-md font-semibold mb-4">RAM Uso (%)</h3>
//               <div className="flex justify-end mb-2 text-sm flex-wrap">
//                 {filteredDatasets.map((dataset, index) => (
//                   <span key={index} className="mr-4 mb-1">
//                     <span className="inline-block w-3 h-3 mr-1" style={{ backgroundColor: dataset.color }}></span> 
//                     {dataset.name}
//                   </span>
//                 ))}
//               </div>
//               <ResponsiveContainer width="100%" height={300}>
//                 <LineChart data={combinedData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="label" />
//                   <YAxis domain={[0, 100]} />
//                   <Tooltip 
//                     formatter={(value, name) => {
//                       const datasetId = name.split('_').pop();
//                       const dataset = datasets.find(d => d.id === parseInt(datasetId));
//                       return [`${value}%`, dataset ? dataset.name : name];
//                     }}
//                     labelFormatter={(label) => `Segundo: ${label}`}
//                   />
//                   <Legend content={() => null} />
//                   {filteredDatasets.map((dataset) => (
//                     <Line 
//                       key={dataset.id}
//                       type="monotone" 
//                       dataKey={`ram_uso_${dataset.id}`} 
//                       stroke={dataset.color} 
//                       name={`RAM_${dataset.id}`} 
//                     />
//                   ))}
//                 </LineChart>
//               </ResponsiveContainer>
//             </div>
            
//             {/* Gráfico Latencia */}
//             <div className="bg-white p-4 rounded shadow">
//               <h3 className="text-md font-semibold mb-4">Latencia (ms)</h3>
//               <div className="flex justify-end mb-2 text-sm flex-wrap">
//                 {filteredDatasets.map((dataset, index) => (
//                   <span key={index} className="mr-4 mb-1">
//                     <span className="inline-block w-3 h-3 mr-1" style={{ backgroundColor: dataset.color }}></span> 
//                     {dataset.name}
//                   </span>
//                 ))}
//               </div>
//               <ResponsiveContainer width="100%" height={300}>
//                 <LineChart data={combinedData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="label" />
//                   <YAxis />
//                   <Tooltip 
//                     formatter={(value, name) => {
//                       const datasetId = name.split('_').pop();
//                       const dataset = datasets.find(d => d.id === parseInt(datasetId));
//                       return [`${value} ms`, dataset ? dataset.name : name];
//                     }}
//                     labelFormatter={(label) => `Segundo: ${label}`}
//                   />
//                   <Legend content={() => null} />
//                   {filteredDatasets.map((dataset) => (
//                     <Line 
//                       key={dataset.id}
//                       type="monotone" 
//                       dataKey={`latencia_${dataset.id}`} 
//                       stroke={dataset.color} 
//                       name={`Latencia_${dataset.id}`} 
//                     />
//                   ))}
//                 </LineChart>
//               </ResponsiveContainer>
//             </div>
//           </div>
          
//           {/* Tablas de valores promedio */}
//           <h2 className="text-xl font-bold mb-6 text-gray-800 bg-white p-4 rounded-lg shadow-lg border border-gray-200 border-l-4 border-l-orange-600 pl-6">Tablas de Valores Promedio</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
//             {renderAveragesTable('num_peticiones', 'Peticiones por Segundo')}
//             {renderAveragesTable('tp_ejec', 'Tiempo de Ejecución', ' ms')}
//             {renderAveragesTable('tp_resp', 'Tiempo de Respuesta', ' ms')}
//             {renderAveragesTable('cpu_uso', 'CPU Uso', '%')}
//             {renderAveragesTable('ram_uso', 'RAM Uso', '%')}
//             {renderAveragesTable('latencia', 'Latencia', ' ms')}
//           </div>
          
//           {/* Datos recientes para cada dataset */}
//           <h2 className="text-xl font-bold mb-6 text-gray-800 bg-white p-4 rounded-lg shadow-lg border border-gray-200 border-l-4 border-l-teal-600 pl-6">Últimos Registros por Archivo</h2>
//           <div className="grid grid-cols-1 gap-8 mb-10">
//             {filteredDatasets.map((dataset, index) => (
//               <div key={index} className="bg-white p-6 rounded-lg shadow-lg border-2 overflow-hidden" style={{ borderColor: dataset.color }}>
//                 <h3 className="text-lg font-bold mb-4 flex items-center" style={{ color: dataset.color }}>
//                   <div className="w-5 h-5 mr-2 rounded" style={{ backgroundColor: dataset.color }}></div>
//                   {dataset.name} - Últimos registros
//                 </h3>
//                 <div className="overflow-x-auto shadow-inner rounded-lg border border-gray-200 bg-gray-50 p-1">
//                   <table className="min-w-full divide-y divide-gray-200 border">
//                     <thead className="bg-gray-100">
//                       <tr>
//                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Momento</th>
//                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Peticiones</th>
//                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">T. Ejec</th>
//                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">T. Resp</th>
//                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">CPU %</th>
//                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">RAM %</th>
//                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Latencia</th>
//                       </tr>
//                     </thead>
//                     <tbody className="bg-white divide-y divide-gray-200">
//                       {dataset.filteredData.slice(Math.max(0, dataset.filteredData.length - 5)).reverse().map((item, rowIndex) => (
//                         <tr key={rowIndex} 
//                             className="hover:bg-gray-50 transition-colors duration-200"
//                             style={{ backgroundColor: rowIndex % 2 === 0 ? `${dataset.color}15` : 'white' }}>
//                           <td className="px-6 py-4 whitespace-nowrap font-medium">{item.hora}</td>
//                           <td className="px-6 py-4 whitespace-nowrap">{item.num_peticiones}</td>
//                           <td className="px-6 py-4 whitespace-nowrap">{item.tp_ejec} ms</td>
//                           <td className="px-6 py-4 whitespace-nowrap">{item.tp_resp} ms</td>
//                           <td className="px-6 py-4 whitespace-nowrap">{item.cpu_uso}%</td>
//                           <td className="px-6 py-4 whitespace-nowrap">{item.ram_uso}%</td>
//                           <td className="px-6 py-4 whitespace-nowrap">{item.latencia} ms</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </>
//       )}
//     </div>
//   );
// };

// export default GraficosRendimiento;

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import * as _ from 'lodash';

const GraficosRendimiento = () => {
  const [datasets, setDatasets] = useState([]); // Array de datasets
  const [loading, setLoading] = useState(false);
  const [filteredDatasets, setFilteredDatasets] = useState([]); // Datasets filtrados por tiempo
  const [combinedData, setCombinedData] = useState([]);
  const [timeRange, setTimeRange] = useState(60); // Mostrar los últimos X segundos
  const [colors] = useState([
    '#2563EB', // azul intenso
    '#16A34A', // verde intenso
    '#EA580C', // naranja intenso
    '#DC2626', // rojo intenso
    '#7E22CE', // púrpura intenso
    '#DB2777', // rosa intenso
    '#0E7490', // teal intenso
    '#CA8A04', // amarillo intenso
    '#4338CA', // indigo intenso
    '#E11D48', // rojo cereza
    '#059669', // esmeralda
    '#0369A1', // azul marino
  ]);
  
  useEffect(() => {
    if (datasets.length > 0) {
      updateFilteredData(datasets, timeRange);
    }
  }, [timeRange, datasets]);
  
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
        const colorIndex = datasets.length % colors.length;
        const color = colors[colorIndex];
        
        const processedData = processDatos(result.data, datasets.length);
        
        setDatasets(prev => [...prev, {
          id: datasets.length,
          name: file.name,
          color: color,
          data: processedData.data,
          stats: processedData.stats
        }]);
        
        setLoading(false);
      };
      reader.readAsText(file);
    }
  };
  
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
      promedioPeticionesPorSegundo: Math.round(datosOrdenados.reduce((sum, item) => sum + item.num_peticiones, 0) / datosOrdenados.length),
      maxPeticionesPorSegundo: Math.max(...datosOrdenados.map(item => item.num_peticiones)),
      minPeticionesPorSegundo: Math.min(...datosOrdenados.map(item => item.num_peticiones)),
      promedioTiempoEjecucion: Math.round(datosOrdenados.reduce((sum, item) => sum + item.tp_ejec, 0) / datosOrdenados.length),
      promedioTiempoRespuesta: Math.round(datosOrdenados.reduce((sum, item) => sum + item.tp_resp, 0) / datosOrdenados.length),
      promedioCPU: (datosOrdenados.reduce((sum, item) => sum + item.cpu_uso, 0) / datosOrdenados.length).toFixed(2),
      promedioRAM: (datosOrdenados.reduce((sum, item) => sum + item.ram_uso, 0) / datosOrdenados.length).toFixed(2),
      promedioLatencia: (datosOrdenados.reduce((sum, item) => sum + item.latencia, 0) / datosOrdenados.length).toFixed(2)
    };
    
    return {
      data: datosOrdenados,
      stats: stats
    };
  };
  
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
  
  // Crear una tabla de promedios para una métrica específica en todos los datasets
  const renderAveragesTable = (metric, title, unit = '') => {
    if (filteredDatasets.length === 0) return null;
    
    // Calcular promedio para cada dataset en el período de tiempo filtrado
    const averages = filteredDatasets.map(dataset => {
      const values = dataset.filteredData.map(item => item[metric]);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      return {
        id: dataset.id,
        name: dataset.name,
        color: dataset.color,
        average: parseFloat(avg.toFixed(2))
      };
    });
    
    // Ordenar por promedio descendente
    const sortedAverages = [...averages].sort((a, b) => b.average - a.average);
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">{title} - Promedios</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Archivo</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Promedio</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAverages.map((item, index) => (
                <tr key={index} 
                    className="hover:bg-gray-50 transition-colors duration-200"
                    style={{ backgroundColor: index % 2 === 0 ? `${item.color}15` : 'white' }}>
                  <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                    <div className="flex items-center">
                      <span className="inline-block w-4 h-4 mr-3 rounded-sm border border-gray-300" 
                            style={{ backgroundColor: item.color }}></span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold" style={{ color: item.color }}>
                    {item.average}{unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  if (loading && datasets.length === 0) {
    return <div className="p-4 text-center">Cargando datos...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800 border-b-4 border-blue-600 pb-4 max-w-3xl mx-auto">Análisis Comparativo de Rendimiento</h1>
      
      <div className="mb-8 bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-6 text-gray-800 border-l-4 border-blue-600 pl-3">Agregar Archivos CSV</h2>
        <div className="flex flex-wrap items-center">
          <label className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition cursor-pointer mb-4 mr-4">
            <span>Seleccionar archivo CSV</span>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleAddFile} 
              className="hidden"
              disabled={loading}
            />
          </label>
        </div>
        
        {datasets.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-l-4 border-green-600 pl-3">Archivos Cargados</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {datasets.map((dataset, index) => (
                <div key={index} className="p-5 rounded-lg shadow-lg border-2" 
                     style={{ 
                       backgroundColor: `${dataset.color}10`, 
                       borderColor: dataset.color 
                     }}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-bold text-gray-800 flex items-center">
                      <div className="w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: dataset.color }}></div>
                      {dataset.name}
                    </div>
                    <button 
                      onClick={() => removeDataset(dataset.id)}
                      className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm bg-white p-3 rounded-lg border border-gray-200">
                    <div className="py-1">Peticiones/s: <span className="font-bold text-gray-800">{dataset.stats.promedioPeticionesPorSegundo}</span></div>
                    <div className="py-1">T. Ejecución: <span className="font-bold text-gray-800">{dataset.stats.promedioTiempoEjecucion} ms</span></div>
                    <div className="py-1">CPU: <span className="font-bold text-gray-800">{dataset.stats.promedioCPU}%</span></div>
                    <div className="py-1">RAM: <span className="font-bold text-gray-800">{dataset.stats.promedioRAM}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {datasets.length > 0 && (
        <>
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <h2 className="text-xl font-bold mb-4 md:mb-0 text-gray-800 border-l-4 border-purple-600 pl-3">Gráficos Comparativos</h2>
            <div className="flex gap-3">
              <button 
                onClick={() => setTimeRange(30)}
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${timeRange === 30 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                30s
              </button>
              <button 
                onClick={() => setTimeRange(60)}
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${timeRange === 60 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                60s
              </button>
              <button 
                onClick={() => setTimeRange(120)}
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${timeRange === 120 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                120s
              </button>
              <button 
                onClick={() => setTimeRange(Math.max(...datasets.map(d => d.data.length)))}
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${timeRange === Math.max(...datasets.map(d => d.data.length)) ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Todo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Gráfico Peticiones por Segundo */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">Peticiones por Segundo</h3>
              <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
                {filteredDatasets.map((dataset, index) => (
                  <span key={index} className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200">
                    <span className="inline-block w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: dataset.color }}></span> 
                    {dataset.name}
                  </span>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={combinedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="label" tick={{ fill: '#4b5563' }} />
                    <YAxis tick={{ fill: '#4b5563' }} />
                    <Tooltip 
                      formatter={(value, name) => {
                        const datasetId = name.split('_').pop();
                        const dataset = datasets.find(d => d.id === parseInt(datasetId));
                        return [value, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
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
            
            {/* Gráfico Tiempo de Ejecución */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">Tiempo de Ejecución</h3>
              <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
                {filteredDatasets.map((dataset, index) => (
                  <span key={index} className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200">
                    <span className="inline-block w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: dataset.color }}></span> 
                    {dataset.name}
                  </span>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={combinedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="label" tick={{ fill: '#4b5563' }} />
                    <YAxis tick={{ fill: '#4b5563' }} />
                    <Tooltip 
                      formatter={(value, name) => {
                        const datasetId = name.split('_').pop();
                        const dataset = datasets.find(d => d.id === parseInt(datasetId));
                        return [`${value} ms`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line 
                        key={dataset.id}
                        type="monotone" 
                        dataKey={`tp_ejec_${dataset.id}`} 
                        stroke={dataset.color} 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name={`T. Ejecución_${dataset.id}`} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Gráfico Tiempo de Respuesta */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">Tiempo de Respuesta</h3>
              <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
                {filteredDatasets.map((dataset, index) => (
                  <span key={index} className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200">
                    <span className="inline-block w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: dataset.color }}></span> 
                    {dataset.name}
                  </span>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={combinedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="label" tick={{ fill: '#4b5563' }} />
                    <YAxis tick={{ fill: '#4b5563' }} />
                    <Tooltip 
                      formatter={(value, name) => {
                        const datasetId = name.split('_').pop();
                        const dataset = datasets.find(d => d.id === parseInt(datasetId));
                        return [`${value} ms`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line 
                        key={dataset.id}
                        type="monotone" 
                        dataKey={`tp_resp_${dataset.id}`} 
                        stroke={dataset.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name={`T. Respuesta_${dataset.id}`} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Gráfico Uso CPU */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">CPU Uso (%)</h3>
              <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
                {filteredDatasets.map((dataset, index) => (
                  <span key={index} className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200">
                    <span className="inline-block w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: dataset.color }}></span> 
                    {dataset.name}
                  </span>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={combinedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="label" tick={{ fill: '#4b5563' }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#4b5563' }} />
                    <Tooltip 
                      formatter={(value, name) => {
                        const datasetId = name.split('_').pop();
                        const dataset = datasets.find(d => d.id === parseInt(datasetId));
                        return [`${value}%`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line 
                        key={dataset.id}
                        type="monotone" 
                        dataKey={`cpu_uso_${dataset.id}`} 
                        stroke={dataset.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name={`CPU_${dataset.id}`} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Gráfico Uso RAM */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">RAM Uso (%)</h3>
              <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
                {filteredDatasets.map((dataset, index) => (
                  <span key={index} className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200">
                    <span className="inline-block w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: dataset.color }}></span> 
                    {dataset.name}
                  </span>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={combinedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="label" tick={{ fill: '#4b5563' }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#4b5563' }} />
                    <Tooltip 
                      formatter={(value, name) => {
                        const datasetId = name.split('_').pop();
                        const dataset = datasets.find(d => d.id === parseInt(datasetId));
                        return [`${value}%`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line 
                        key={dataset.id}
                        type="monotone" 
                        dataKey={`ram_uso_${dataset.id}`} 
                        stroke={dataset.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name={`RAM_${dataset.id}`} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Gráfico Latencia */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">Latencia (ms)</h3>
              <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
                {filteredDatasets.map((dataset, index) => (
                  <span key={index} className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200">
                    <span className="inline-block w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: dataset.color }}></span> 
                    {dataset.name}
                  </span>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={combinedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="label" tick={{ fill: '#4b5563' }} />
                    <YAxis tick={{ fill: '#4b5563' }} />
                    <Tooltip 
                      formatter={(value, name) => {
                        const datasetId = name.split('_').pop();
                        const dataset = datasets.find(d => d.id === parseInt(datasetId));
                        return [`${value} ms`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line 
                        key={dataset.id}
                        type="monotone" 
                        dataKey={`latencia_${dataset.id}`} 
                        stroke={dataset.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name={`Latencia_${dataset.id}`} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Tablas de valores promedio */}
          <h2 className="text-xl font-bold mb-6 text-gray-800 bg-white p-4 rounded-lg shadow-lg border border-gray-200 border-l-4 border-l-orange-600 pl-6">Tablas de Valores Promedio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {renderAveragesTable('num_peticiones', 'Peticiones por Segundo')}
            {renderAveragesTable('tp_ejec', 'Tiempo de Ejecución', ' ms')}
            {renderAveragesTable('tp_resp', 'Tiempo de Respuesta', ' ms')}
            {renderAveragesTable('cpu_uso', 'CPU Uso', '%')}
            {renderAveragesTable('ram_uso', 'RAM Uso', '%')}
            {renderAveragesTable('latencia', 'Latencia', ' ms')}
          </div>
          
          {/* Datos recientes para cada dataset */}
          <h2 className="text-xl font-bold mb-6 text-gray-800 bg-white p-4 rounded-lg shadow-lg border border-gray-200 border-l-4 border-l-teal-600 pl-6">Últimos Registros por Archivo</h2>
          <div className="grid grid-cols-1 gap-8 mb-10">
            {filteredDatasets.map((dataset, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg border-2 overflow-hidden" style={{ borderColor: dataset.color }}>
                <h3 className="text-lg font-bold mb-4 flex items-center" style={{ color: dataset.color }}>
                  <div className="w-5 h-5 mr-2 rounded" style={{ backgroundColor: dataset.color }}></div>
                  {dataset.name} - Últimos registros
                </h3>
                <div className="overflow-x-auto shadow-inner rounded-lg border border-gray-200 bg-gray-50 p-1">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Momento</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Peticiones</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">T. Ejec</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">T. Resp</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">CPU %</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">RAM %</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Latencia</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dataset.filteredData.slice(Math.max(0, dataset.filteredData.length - 5)).reverse().map((item, rowIndex) => (
                        <tr key={rowIndex} 
                            className="hover:bg-gray-50 transition-colors duration-200"
                            style={{ backgroundColor: rowIndex % 2 === 0 ? `${dataset.color}15` : 'white' }}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{item.hora}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.num_peticiones}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.tp_ejec} ms</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.tp_resp} ms</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.cpu_uso}%</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.ram_uso}%</td>
                          <td className="px-6 py-4 whitespace-nowrap">{item.latencia} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default GraficosRendimiento;