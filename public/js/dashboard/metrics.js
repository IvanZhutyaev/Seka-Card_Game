import Chart from 'chart.js/auto';
import { format } from 'date-fns';

class MetricsDashboard {
    constructor(container) {
        this.container = container;
        this.charts = new Map();
        this.metrics = new Map();
        this.period = '1h';
    
        this.init();
    }
  
    async init() {
        this.createLayout();
        await this.loadMetrics();
        this.setupEventListeners();
    }
  
    createLayout() {
    // Создаем элементы управления
        const controls = document.createElement('div');
        controls.className = 'metrics-controls';
    
        const periodSelect = document.createElement('select');
        periodSelect.innerHTML = `
      <option value="1h">Last Hour</option>
      <option value="1d">Last Day</option>
      <option value="1w">Last Week</option>
    `;
        periodSelect.value = this.period;
    
        const refreshButton = document.createElement('button');
        refreshButton.textContent = 'Refresh';
    
        controls.appendChild(periodSelect);
        controls.appendChild(refreshButton);
    
        // Создаем контейнер для графиков
        const chartsContainer = document.createElement('div');
        chartsContainer.className = 'metrics-charts';
    
        this.container.appendChild(controls);
        this.container.appendChild(chartsContainer);
    }
  
    setupEventListeners() {
        const periodSelect = this.container.querySelector('select');
        const refreshButton = this.container.querySelector('button');
    
        periodSelect.addEventListener('change', (e) => {
            this.period = e.target.value;
            this.loadMetrics();
        });
    
        refreshButton.addEventListener('click', () => {
            this.loadMetrics();
        });
    }
  
    async loadMetrics() {
        try {
            const response = await fetch(`/api/metrics/aggregate?period=${this.period}`, {
                headers: {
                    'x-api-key': process.env.API_KEY
                }
            });
      
            if (!response.ok) {
                throw new Error('Failed to load metrics');
            }
      
            const data = await response.json();
            this.updateMetrics(data);
        } catch (error) {
            console.error('Error loading metrics:', error);
            this.showError('Failed to load metrics');
        }
    }
  
    updateMetrics(data) {
        this.metrics.set(data.name, data.values);
        this.updateChart(data.name);
    }
  
    updateChart(metricName) {
        const values = this.metrics.get(metricName);
        if (!values) return;
    
        const chartContainer = this.container.querySelector('.metrics-charts');
        let chartElement = chartContainer.querySelector(`#chart-${metricName}`);
    
        if (!chartElement) {
            chartElement = document.createElement('canvas');
            chartElement.id = `chart-${metricName}`;
            chartContainer.appendChild(chartElement);
        }
    
        const ctx = chartElement.getContext('2d');
    
        if (this.charts.has(metricName)) {
            this.charts.get(metricName).destroy();
        }
    
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: values.map(v => format(new Date(v.timestamp), 'HH:mm')),
                datasets: [
                    {
                        label: 'Average',
                        data: values.map(v => v.avg),
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    },
                    {
                        label: 'Min',
                        data: values.map(v => v.min),
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    },
                    {
                        label: 'Max',
                        data: values.map(v => v.max),
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: metricName
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    
        this.charts.set(metricName, chart);
    }
  
    showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
    
        this.container.appendChild(errorElement);
    
        setTimeout(() => {
            errorElement.remove();
        }, 3000);
    }
}

// Создаем стили для дашборда
const styles = `
  .metrics-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .metrics-charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }
  
  .metrics-charts canvas {
    width: 100% !important;
    height: 300px !important;
  }
  
  .error-message {
    position: fixed;
    top: 1rem;
    right: 1rem;
    background-color: #ff4444;
    color: white;
    padding: 1rem;
    border-radius: 4px;
    animation: slideIn 0.3s ease-out;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

// Добавляем стили на страницу
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);

export default MetricsDashboard; 