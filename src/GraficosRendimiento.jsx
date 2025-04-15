import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import * as _ from 'lodash';

const GraficosRendimiento = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [timeRange, setTimeRange] = useState(60); // Mostrar los últimos X segundos

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('data1000.csv');
        if (!response.ok) {
          throw new Error('Error al cargar el archivo CSV');
        }
        const csvText = await response.text();
        const result = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });

        const groupedBySecond = _.groupBy(result.data, 'fecha_ejecucion');

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
            num_peticiones: peticiones.length
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

        setStatsData(stats);
        setData(datosOrdenados);
        updateFilteredData(datosOrdenados, timeRange);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar los datos:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  useEffect(() => {
    if (data.length > 0) {
      updateFilteredData(data, timeRange);
    }
  }, [timeRange, data]);
  
  const updateFilteredData = (allData, range) => {
    const dataLength = allData.length;
    const filteredItems = dataLength <= range ? 
      allData : 
      allData.slice(Math.max(0, dataLength - range));
    setFilteredData(filteredItems);
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
  
  if (loading) {
    return <div className="p-4 text-center">Cargando datos...</div>;
  }

  return (
    <div className="p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-center">Análisis de Rendimiento por Segundo</h1>
      
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-sm">Total Segundos Analizados</div>
            <div className="text-2xl font-bold">{statsData.totalSegundos}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-sm">Prom. Peticiones/Segundo</div>
            <div className="text-2xl font-bold">{statsData.promedioPeticionesPorSegundo}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-sm">Prom. Tiempo Ejecución</div>
            <div className="text-2xl font-bold">{statsData.promedioTiempoEjecucion} ms</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-sm">Prom. Uso CPU</div>
            <div className="text-2xl font-bold">{statsData.promedioCPU}%</div>
          </div>
        </div>
      )}
      
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Gráficos de Rendimiento</h2>
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
            onClick={() => setTimeRange(data.length)}
            className={`px-3 py-1 rounded text-sm ${timeRange === data.length ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Todo
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-4">Peticiones por Segundo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [value, name === 'num_peticiones' ? 'Peticiones' : name]}
                labelFormatter={(label) => `Segundo: ${label}`}
              />
              <Legend />
              <Bar dataKey="num_peticiones" fill="#8884d8" name="Peticiones" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-4">Tiempo de Ejecución y Respuesta</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [`${value} ms`, name === 'tp_ejec' ? 'T. Ejecución' : 'T. Respuesta']}
                labelFormatter={(label) => `Segundo: ${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="tp_ejec" stroke="#8884d8" name="T. Ejecución" />
              <Line type="monotone" dataKey="tp_resp" stroke="#82ca9d" name="T. Respuesta" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-4">CPU y Memoria (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value, name) => [`${value}%`, name === 'cpu_uso' ? 'CPU' : 'RAM']}
                labelFormatter={(label) => `Segundo: ${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="cpu_uso" stroke="#8884d8" name="CPU" />
              <Line type="monotone" dataKey="ram_uso" stroke="#82ca9d" name="RAM" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-4">Latencia (ms)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${value} ms`, 'Latencia']}
                labelFormatter={(label) => `Segundo: ${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="latencia" stroke="#ff7300" name="Latencia" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded shadow overflow-x-auto">
        <h3 className="text-md font-semibold mb-4">Tabla de Datos Promediados por Segundo</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Momento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peticiones</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T. Ejecución</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T. Respuesta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RAM %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latencia</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.slice(Math.max(0, filteredData.length - 10)).reverse().map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="px-6 py-2 whitespace-nowrap">{item.hora}</td>
                <td className="px-6 py-2 whitespace-nowrap">{item.num_peticiones}</td>
                <td className="px-6 py-2 whitespace-nowrap">{item.tp_ejec} ms</td>
                <td className="px-6 py-2 whitespace-nowrap">{item.tp_resp} ms</td>
                <td className="px-6 py-2 whitespace-nowrap">{item.cpu_uso}%</td>
                <td className="px-6 py-2 whitespace-nowrap">{item.ram_uso}%</td>
                <td className="px-6 py-2 whitespace-nowrap">{item.latencia} ms</td>
                <td className="px-6 py-2 whitespace-nowrap text-xs">{item.endpoint.split('/').slice(-2).join('/')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GraficosRendimiento;