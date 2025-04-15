import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import * as _ from 'lodash';

const GraficosRendimiento = () => {
  const [data1, setData1] = useState([]);
  const [data2, setData2] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsData1, setStatsData1] = useState(null);
  const [statsData2, setStatsData2] = useState(null);
  const [filteredData1, setFilteredData1] = useState([]);
  const [filteredData2, setFilteredData2] = useState([]);
  const [combinedData, setCombinedData] = useState([]);
  const [timeRange, setTimeRange] = useState(60); // Mostrar los últimos X segundos
  const [csvFiles, setCsvFiles] = useState({
    csv1: 'data1000.csv',
    csv2: 'data.csv'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar ambos archivos CSV
        const [response1, response2] = await Promise.all([
          fetch(csvFiles.csv1),
          fetch(csvFiles.csv2)
        ]);
        
        if (!response1.ok || !response2.ok) {
          throw new Error('Error al cargar alguno de los archivos CSV');
        }
        
        const [csvText1, csvText2] = await Promise.all([
          response1.text(),
          response2.text()
        ]);
        
        const result1 = Papa.parse(csvText1, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        
        const result2 = Papa.parse(csvText2, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });

        const processed1 = processDatos(result1.data, 'csv1');
        const processed2 = processDatos(result2.data, 'csv2');
        
        setData1(processed1);
        setData2(processed2);
        
        updateFilteredData(processed1, processed2, timeRange);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar los datos:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [csvFiles]);
  
  useEffect(() => {
    if (data1.length > 0 && data2.length > 0) {
      updateFilteredData(data1, data2, timeRange);
    }
  }, [timeRange, data1, data2]);
  
  const processDatos = (rawData, source) => {
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
        source: source // Agregar la fuente del dato
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
      promedioRAM: (datosOrdenados.reduce((sum, item) => sum + item.ram_uso, 0) / datosOrdenados.length).toFixed(2)
    };
    
    if (source === 'csv1') {
      setStatsData1(stats);
    } else {
      setStatsData2(stats);
    }
    
    return datosOrdenados;
  };
  
  const updateFilteredData = (allData1, allData2, range) => {
    const dataLength1 = allData1.length;
    const dataLength2 = allData2.length;
    
    const filtered1 = dataLength1 <= range ? 
      allData1 : 
      allData1.slice(Math.max(0, dataLength1 - range));
      
    const filtered2 = dataLength2 <= range ? 
      allData2 : 
      allData2.slice(Math.max(0, dataLength2 - range));
    
    setFilteredData1(filtered1);
    setFilteredData2(filtered2);
    
    // Combinar datos para gráficos comparativos
    const combined = [];
    
    // Crear un conjunto de todas las etiquetas (marcas de tiempo) únicas
    const allLabels = new Set([
      ...filtered1.map(item => item.label),
      ...filtered2.map(item => item.label)
    ]);
    
    // Para cada etiqueta, encontrar los datos correspondientes en ambos conjuntos
    allLabels.forEach(label => {
      const item1 = filtered1.find(item => item.label === label) || {};
      const item2 = filtered2.find(item => item.label === label) || {};
      
      combined.push({
        label,
        // Datos del primer CSV
        tp_ejec_1: item1.tp_ejec || 0,
        tp_resp_1: item1.tp_resp || 0,
        cpu_uso_1: item1.cpu_uso || 0,
        ram_uso_1: item1.ram_uso || 0,
        latencia_1: item1.latencia || 0,
        num_peticiones_1: item1.num_peticiones || 0,
        // Datos del segundo CSV
        tp_ejec_2: item2.tp_ejec || 0,
        tp_resp_2: item2.tp_resp || 0,
        cpu_uso_2: item2.cpu_uso || 0,
        ram_uso_2: item2.ram_uso || 0,
        latencia_2: item2.latencia || 0,
        num_peticiones_2: item2.num_peticiones || 0,
        // Mantener la hora y endpoint para referencia
        hora: item1.hora || item2.hora || '',
        endpoint_1: item1.endpoint || '',
        endpoint_2: item2.endpoint || ''
      });
    });
    
    // Ordenar los datos combinados por etiqueta
    const combinedSorted = _.sortBy(combined, 'label');
    setCombinedData(combinedSorted);
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

  const handleCsvChange = (e, csvNum) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        // Crear un objeto URL para el contenido del archivo cargado
        const blob = new Blob([text], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        setCsvFiles(prev => ({
          ...prev,
          [csvNum]: url
        }));
      };
      reader.readAsText(file);
    }
  };
  
  if (loading) {
    return <div className="p-4 text-center">Cargando datos...</div>;
  }

  return (
    <div className="p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-center">Análisis Comparativo de Rendimiento</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Archivo 1</h2>
          <input 
            type="file" 
            accept=".csv" 
            onChange={(e) => handleCsvChange(e, 'csv1')} 
            className="mb-4"
          />
          {statsData1 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded shadow">
                <div className="text-gray-500 text-sm">Prom. Peticiones/Segundo</div>
                <div className="text-xl font-bold text-blue-600">{statsData1.promedioPeticionesPorSegundo}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded shadow">
                <div className="text-gray-500 text-sm">Prom. T. Ejecución</div>
                <div className="text-xl font-bold text-blue-600">{statsData1.promedioTiempoEjecucion} ms</div>
              </div>
            </div>
          )}
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Archivo 2</h2>
          <input 
            type="file" 
            accept=".csv" 
            onChange={(e) => handleCsvChange(e, 'csv2')} 
            className="mb-4"
          />
          {statsData2 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded shadow">
                <div className="text-gray-500 text-sm">Prom. Peticiones/Segundo</div>
                <div className="text-xl font-bold text-green-600">{statsData2.promedioPeticionesPorSegundo}</div>
              </div>
              <div className="bg-green-50 p-4 rounded shadow">
                <div className="text-gray-500 text-sm">Prom. T. Ejecución</div>
                <div className="text-xl font-bold text-green-600">{statsData2.promedioTiempoEjecucion} ms</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {statsData1 && statsData2 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-sm">Total Segundos Analizados</div>
            <div className="flex justify-between">
              <span className="text-lg font-bold text-blue-600">{statsData1.totalSegundos}</span>
              <span className="text-lg font-bold text-green-600">{statsData2.totalSegundos}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-sm">Prom. CPU Uso (%)</div>
            <div className="flex justify-between">
              <span className="text-lg font-bold text-blue-600">{statsData1.promedioCPU}%</span>
              <span className="text-lg font-bold text-green-600">{statsData2.promedioCPU}%</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-sm">Prom. RAM Uso (%)</div>
            <div className="flex justify-between">
              <span className="text-lg font-bold text-blue-600">{statsData1.promedioRAM}%</span>
              <span className="text-lg font-bold text-green-600">{statsData2.promedioRAM}%</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-sm">Prom. Tiempo Respuesta</div>
            <div className="flex justify-between">
              <span className="text-lg font-bold text-blue-600">{statsData1.promedioTiempoRespuesta} ms</span>
              <span className="text-lg font-bold text-green-600">{statsData2.promedioTiempoRespuesta} ms</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Gráficos Comparativos</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setTimeRange(30)}
            className={`px-3 py-1 rounded text-sm ${timeRange === 30 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            30s
          </button>
          <button 
            onClick={() => setTimeRange(60)}
            className={`px-3 py-1 rounded text-sm ${timeRange === 60 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            60s
          </button>
          <button 
            onClick={() => setTimeRange(120)}
            className={`px-3 py-1 rounded text-sm ${timeRange === 120 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            120s
          </button>
          <button 
            onClick={() => setTimeRange(Math.max(data1.length, data2.length))}
            className={`px-3 py-1 rounded text-sm ${timeRange === Math.max(data1.length, data2.length) ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Todo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-4">Peticiones por Segundo</h3>
          <div className="flex justify-end mb-2 text-sm">
            <span className="mr-4"><span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span> Archivo 1</span>
            <span><span className="inline-block w-3 h-3 bg-green-500 mr-1"></span> Archivo 2</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  const prefix = name.includes('_1') ? 'Archivo 1: ' : 'Archivo 2: ';
                  return [value, prefix + 'Peticiones'];
                }}
                labelFormatter={(label) => `Segundo: ${label}`}
              />
              <Legend content={() => null} />
              <Bar dataKey="num_peticiones_1" fill="#4299e1" name="Peticiones_1" />
              <Bar dataKey="num_peticiones_2" fill="#48bb78" name="Peticiones_2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-4">Tiempo de Ejecución</h3>
          <div className="flex justify-end mb-2 text-sm">
            <span className="mr-4"><span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span> Archivo 1</span>
            <span><span className="inline-block w-3 h-3 bg-green-500 mr-1"></span> Archivo 2</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  const prefix = name.includes('_1') ? 'Archivo 1: ' : 'Archivo 2: ';
                  return [`${value} ms`, prefix + 'T. Ejecución'];
                }}
                labelFormatter={(label) => `Segundo: ${label}`}
              />
              <Legend content={() => null} />
              <Line type="monotone" dataKey="tp_ejec_1" stroke="#4299e1" name="T. Ejecución_1" />
              <Line type="monotone" dataKey="tp_ejec_2" stroke="#48bb78" name="T. Ejecución_2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-4">Tiempo de Respuesta</h3>
          <div className="flex justify-end mb-2 text-sm">
            <span className="mr-4"><span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span> Archivo 1</span>
            <span><span className="inline-block w-3 h-3 bg-green-500 mr-1"></span> Archivo 2</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  const prefix = name.includes('_1') ? 'Archivo 1: ' : 'Archivo 2: ';
                  return [`${value} ms`, prefix + 'T. Respuesta'];
                }}
                labelFormatter={(label) => `Segundo: ${label}`}
              />
              <Legend content={() => null} />
              <Line type="monotone" dataKey="tp_resp_1" stroke="#4299e1" name="T. Respuesta_1" />
              <Line type="monotone" dataKey="tp_resp_2" stroke="#48bb78" name="T. Respuesta_2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-4">CPU Uso (%)</h3>
          <div className="flex justify-end mb-2 text-sm">
            <span className="mr-4"><span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span> Archivo 1</span>
            <span><span className="inline-block w-3 h-3 bg-green-500 mr-1"></span> Archivo 2</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value, name) => {
                  const prefix = name.includes('_1') ? 'Archivo 1: ' : 'Archivo 2: ';
                  return [`${value}%`, prefix + 'CPU'];
                }}
                labelFormatter={(label) => `Segundo: ${label}`}
              />
              <Legend content={() => null} />
              <Line type="monotone" dataKey="cpu_uso_1" stroke="#4299e1" name="CPU_1" />
              <Line type="monotone" dataKey="cpu_uso_2" stroke="#48bb78" name="CPU_2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-4">RAM Uso (%)</h3>
          <div className="flex justify-end mb-2 text-sm">
            <span className="mr-4"><span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span> Archivo 1</span>
            <span><span className="inline-block w-3 h-3 bg-green-500 mr-1"></span> Archivo 2</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value, name) => {
                  const prefix = name.includes('_1') ? 'Archivo 1: ' : 'Archivo 2: ';
                  return [`${value}%`, prefix + 'RAM'];
                }}
                labelFormatter={(label) => `Segundo: ${label}`}
              />
              <Legend content={() => null} />
              <Line type="monotone" dataKey="ram_uso_1" stroke="#4299e1" name="RAM_1" />
              <Line type="monotone" dataKey="ram_uso_2" stroke="#48bb78" name="RAM_2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-4">Latencia (ms)</h3>
          <div className="flex justify-end mb-2 text-sm">
            <span className="mr-4"><span className="inline-block w-3 h-3 bg-blue-500 mr-1"></span> Archivo 1</span>
            <span><span className="inline-block w-3 h-3 bg-green-500 mr-1"></span> Archivo 2</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  const prefix = name.includes('_1') ? 'Archivo 1: ' : 'Archivo 2: ';
                  return [`${value} ms`, prefix + 'Latencia'];
                }}
                labelFormatter={(label) => `Segundo: ${label}`}
              />
              <Legend content={() => null} />
              <Line type="monotone" dataKey="latencia_1" stroke="#4299e1" name="Latencia_1" />
              <Line type="monotone" dataKey="latencia_2" stroke="#48bb78" name="Latencia_2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <h3 className="text-md font-semibold mb-4">Datos Archivo 1</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Momento</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peticiones</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T. Ejec</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU %</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RAM %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData1.slice(Math.max(0, filteredData1.length - 10)).reverse().map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-2 whitespace-nowrap">{item.hora}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{item.num_peticiones}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{item.tp_ejec} ms</td>
                  <td className="px-4 py-2 whitespace-nowrap">{item.cpu_uso}%</td>
                  <td className="px-4 py-2 whitespace-nowrap">{item.ram_uso}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <h3 className="text-md font-semibold mb-4">Datos Archivo 2</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Momento</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peticiones</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T. Ejec</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU %</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RAM %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData2.slice(Math.max(0, filteredData2.length - 10)).reverse().map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-green-50' : ''}>
                  <td className="px-4 py-2 whitespace-nowrap">{item.hora}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{item.num_peticiones}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{item.tp_ejec} ms</td>
                  <td className="px-4 py-2 whitespace-nowrap">{item.cpu_uso}%</td>
                  <td className="px-4 py-2 whitespace-nowrap">{item.ram_uso}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GraficosRendimiento;