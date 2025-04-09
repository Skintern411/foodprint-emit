// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    const navLinks = document.querySelectorAll('nav ul li a');
    const sections = document.querySelectorAll('main section');
    
    // Tab selection
    const billTypeTabs = document.querySelectorAll('.tab');
    const billForms = document.querySelectorAll('.bill-form');
    
    // Bill type buttons
    const billTypeButtons = document.querySelectorAll('.bill-type-button');
    const billContents = document.querySelectorAll('.bill-content');
    const billInfoText = document.getElementById('billInfoText');
    const billTypeInput = document.getElementById('billType');
    
    // Form elements - Single Analysis
    const emissionForm = document.getElementById('emissionForm');
    const foodImageFile = document.getElementById('foodImageFile');
    const foodImagePreview = document.getElementById('foodImagePreview');
    const electricityImageFile = document.getElementById('electricityImageFile');
    const electricityImagePreview = document.getElementById('electricityImagePreview');
    const waterImageFile = document.getElementById('waterImageFile');
    const waterImagePreview = document.getElementById('waterImagePreview');
    
    // Results elements - Single Analysis
    const loadingIndicator = document.getElementById('loadingIndicator');
    const analysisResults = document.getElementById('analysisResults');
    const resultsContent = document.getElementById('resultsContent');
    const treesCount = document.getElementById('treesCount');
    const rewardsPoints = document.getElementById('rewardsPoints');
    const rewardsMessage = document.getElementById('rewardsMessage');
    const saveResultsBtn = document.getElementById('saveResultsBtn');
    const newAnalysisBtn = document.getElementById('newAnalysisBtn');
    
    // Multiple Bills Analysis
    const multipleBillsForm = document.getElementById('multipleBillsForm');
    const includeFoodBill = document.getElementById('includeFoodBill');
    const includeElectricityBill = document.getElementById('includeElectricityBill');
    const includeWaterBill = document.getElementById('includeWaterBill');
    const foodBillContent = document.getElementById('foodBillContent');
    const electricityBillContent = document.getElementById('electricityBillContent');
    const waterBillContent = document.getElementById('waterBillContent');
    const foodImageFileMultiple = document.getElementById('foodImageFileMultiple');
    const foodImagePreviewMultiple = document.getElementById('foodImagePreviewMultiple');
    const electricityImageFileMultiple = document.getElementById('electricityImageFileMultiple');
    const electricityImagePreviewMultiple = document.getElementById('electricityImagePreviewMultiple');
    const waterImageFileMultiple = document.getElementById('waterImageFileMultiple');
    const waterImagePreviewMultiple = document.getElementById('waterImagePreviewMultiple');
    
    // Results elements - Multiple Analysis
    const multipleLoadingIndicator = document.getElementById('multipleLoadingIndicator');
    const multipleAnalysisResults = document.getElementById('multipleAnalysisResults');
    const totalEmissionsValue = document.getElementById('totalEmissionsValue');
    const emissionDistribution = document.getElementById('emissionDistribution');
    const billsAccordion = document.getElementById('billsAccordion');
    const multipleTreesToPlant = document.getElementById('multipleTreesToPlant');
    const totalRewardsPoints = document.getElementById('totalRewardsPoints');
    const saveMultipleResultsBtn = document.getElementById('saveMultipleResultsBtn');
    const newMultipleAnalysisBtn = document.getElementById('newMultipleAnalysisBtn');
    
    // History elements
    const historyTableBody = document.getElementById('historyTableBody');
    const emissionsChart = document.getElementById('emissionsChart');
    const historySummaryEmissions = document.getElementById('historySummaryEmissions');
    const historySummaryRewards = document.getElementById('historySummaryRewards');
    const historySummaryTrees = document.getElementById('historySummaryTrees');
    const toggleWeekly = document.getElementById('toggleWeekly');
    const toggleMonthly = document.getElementById('toggleMonthly');
    const toggleYearly = document.getElementById('toggleYearly');
    const filterBillType = document.getElementById('filterBillType');
    const filterDateRange = document.getElementById('filterDateRange');
    
    // Rewards elements
    const rewardsSummaryPoints = document.getElementById('rewardsSummaryPoints');
    const rewardsLevel = document.getElementById('rewardsLevel');
    const rewardsImpact = document.getElementById('rewardsImpact');
    const levelProgressBar = document.getElementById('levelProgressBar');
    const currentPoints = document.getElementById('currentPoints');
    const pointsToNextLevel = document.getElementById('pointsToNextLevel');
    const treeVisualization = document.getElementById('treeVisualization');
    const treesSaved = document.getElementById('treesSaved');
    
    // User's emission history
    let emissionHistory = [];
    
    // Current analysis results
    let currentAnalysis = null;
    let currentMultipleAnalysis = null;
    
    // Chart instance
    let historyChartInstance = null;
    let distributionChartInstance = null;
    
    // Total rewards and level thresholds
    const REWARDS_LEVELS = {
        "beginner": { min: 0, max: 99 },
        "explorer": { min: 100, max: 499 },
        "guardian": { min: 500, max: 999 },
        "champion": { min: 1000, max: Infinity }
    };
    
    // Bill type info
    const BILL_TYPES_INFO = {
        "food": {
            name: "Food",
            description: "Our AI can analyze your food bills or meal descriptions to estimate CO2 emissions. Simply upload an image or describe what you ate.",
            icon: "utensils",
            color: "#2ecc71"
        },
        "electricity": {
            name: "Electricity",
            description: "Upload your electricity bill or describe your electricity usage to calculate its carbon footprint and get personalized tips to reduce your emissions.",
            icon: "bolt",
            color: "#3498db"
        },
        "water": {
            name: "Water",
            description: "Analyze your water bill or describe your water consumption habits to estimate CO2 emissions and learn ways to conserve water resources.",
            icon: "water",
            color: "#00bcd4"
        }
    };
    
    // Initialize the application
    initApp();
    
    // ---------- INITIALIZATION FUNCTIONS ----------
    
    // Initialize the application
    function initApp() {
        // Set up navigation
        setupNavigation();
        
        // Set up tab selection
        setupTabSelection();
        
        // Set up bill type buttons
        setupBillTypeButtons();
        
        // Set up bill section toggles
        setupBillSectionToggles();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load emission history
        fetchEmissionHistory();
        
        // Initialize rewards section
        initializeRewardsSection();
    }
    
    // Set up navigation
    function setupNavigation() {
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Get the target section ID
                const targetId = this.getAttribute('href').substring(1);
                
                // Update active navigation link
                navLinks.forEach(navLink => {
                    navLink.parentElement.classList.remove('active');
                });
                this.parentElement.classList.add('active');
                
                // Show the target section, hide others
                sections.forEach(section => {
                    if (section.id === targetId) {
                        section.classList.remove('hidden-section');
                        section.classList.add('active-section');
                    } else {
                        section.classList.add('hidden-section');
                        section.classList.remove('active-section');
                    }
                });
                
                // If navigating to history, update the chart
                if (targetId === 'history') {
                    updateHistoryChart();
                }
                
                // If navigating to rewards, update rewards visualization
                if (targetId === 'rewards') {
                    updateRewardsVisualization();
                }
            });
        });
    }
    
    // Set up tab selection
    function setupTabSelection() {
        billTypeTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Update active tab
                billTypeTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Show corresponding form
                const billType = this.getAttribute('data-bill-type');
                billForms.forEach(form => {
                    form.classList.remove('active-form');
                    if (form.id === `${billType}BillForm`) {
                        form.classList.add('active-form');
                    }
                });
            });
        });
    }
    
    // Set up bill type buttons
    function setupBillTypeButtons() {
        billTypeButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Update active button
                billTypeButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Show corresponding content
                const billType = this.getAttribute('data-bill-type');
                billContents.forEach(content => {
                    content.style.display = 'none';
                });
                document.getElementById(`${billType}_content`).style.display = 'block';
                
                // Update info text
                billInfoText.textContent = BILL_TYPES_INFO[billType].description;
                
                // Update hidden input
                billTypeInput.value = billType;
            });
        });
    }
    
    // Set up bill section toggles
    function setupBillSectionToggles() {
        // Food bill toggle
        includeFoodBill.addEventListener('change', function() {
            foodBillContent.style.display = this.checked ? 'block' : 'none';
        });
        
        // Electricity bill toggle
        includeElectricityBill.addEventListener('change', function() {
            electricityBillContent.style.display = this.checked ? 'block' : 'none';
        });
        
        // Water bill toggle
        includeWaterBill.addEventListener('change', function() {
            waterBillContent.style.display = this.checked ? 'block' : 'none';
        });
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Image file input change - Single Analysis
        if (foodImageFile) foodImageFile.addEventListener('change', function(e) { handleImageUpload(e, foodImagePreview); });
        if (electricityImageFile) electricityImageFile.addEventListener('change', function(e) { handleImageUpload(e, electricityImagePreview); });
        if (waterImageFile) waterImageFile.addEventListener('change', function(e) { handleImageUpload(e, waterImagePreview); });
        
        // Image file input change - Multiple Analysis
        if (foodImageFileMultiple) foodImageFileMultiple.addEventListener('change', function(e) { handleImageUpload(e, foodImagePreviewMultiple); });
        if (electricityImageFileMultiple) electricityImageFileMultiple.addEventListener('change', function(e) { handleImageUpload(e, electricityImagePreviewMultiple); });
        if (waterImageFileMultiple) waterImageFileMultiple.addEventListener('change', function(e) { handleImageUpload(e, waterImagePreviewMultiple); });
        
        // Form submission - Single Analysis
        if (emissionForm) emissionForm.addEventListener('submit', handleSingleFormSubmit);
        
        // Form submission - Multiple Analysis
        if (multipleBillsForm) multipleBillsForm.addEventListener('submit', handleMultipleFormSubmit);
        
        // Save results buttons
        if (saveResultsBtn) saveResultsBtn.addEventListener('click', saveSingleResultsToHistory);
        if (saveMultipleResultsBtn) saveMultipleResultsBtn.addEventListener('click', saveMultipleResultsToHistory);
        
        // New analysis buttons
        if (newAnalysisBtn) newAnalysisBtn.addEventListener('click', resetSingleAnalysisForm);
        if (newMultipleAnalysisBtn) newMultipleAnalysisBtn.addEventListener('click', resetMultipleAnalysisForm);
        
        // Chart toggle buttons
        if (toggleWeekly) toggleWeekly.addEventListener('click', function() { updateChartPeriod('weekly'); });
        if (toggleMonthly) toggleMonthly.addEventListener('click', function() { updateChartPeriod('monthly'); });
        if (toggleYearly) toggleYearly.addEventListener('click', function() { updateChartPeriod('yearly'); });
        
        // Filters for history
        if (filterBillType) filterBillType.addEventListener('change', filterHistory);
        if (filterDateRange) filterDateRange.addEventListener('change', filterHistory);
    }
    
    // Initialize rewards section
    function initializeRewardsSection() {
        // Set initial values
        updateRewardsLevel(0);
    }
    
    // ---------- DATA FETCHING FUNCTIONS ----------
    
    // Fetch emission history from the server
    function fetchEmissionHistory() {
        fetch('/emission-history')
            .then(response => response.json())
            .then(data => {
                emissionHistory = data.history;
                updateHistoryTable();
                updateHistoryChart();
                updateHistorySummary();
                updateRewardsStatus();
            })
            .catch(error => console.error('Error fetching emission history:', error));
    }
    
    // ---------- UI UPDATE FUNCTIONS ----------
    
    // Handle image upload preview
    function handleImageUpload(e, previewElement) {
        const file = e.target.files[0];
        
        if (file) {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                previewElement.src = event.target.result;
                previewElement.style.display = 'block';
            };
            
            reader.readAsDataURL(file);
        } else {
            previewElement.style.display = 'none';
        }
    }
    
    // Update history table
    function updateHistoryTable() {
        historyTableBody.innerHTML = '';
        
        // Filter history if filters are active
        let filteredHistory = filterHistoryData();
        
        filteredHistory.forEach((item, index) => {
            const row = document.createElement('tr');
            
            // Get icon based on bill type
            const typeIcon = BILL_TYPES_INFO[item.bill_type]?.icon || 'file-invoice';
            
            row.innerHTML = `
                <td>${item.date}</td>
                <td><i class="fas fa-${typeIcon}"></i> ${BILL_TYPES_INFO[item.bill_type]?.name || item.bill_type}</td>
                <td>${item.description}</td>
                <td>${item.emissions} ${item.unit}</td>
                <td>${item.rewards} points</td>
                <td class="table-actions">
                    <button class="view-btn" data-index="${index}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="delete-btn" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            historyTableBody.appendChild(row);
        });
        
        // Add event listeners to the buttons
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                viewHistoryItem(index);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                deleteHistoryItem(index);
            });
        });
    }
    
    // Filter history data based on active filters
    function filterHistoryData() {
        let filteredHistory = [...emissionHistory];
        
        // Filter by bill type
        const selectedType = filterBillType.value;
        if (selectedType !== 'all') {
            filteredHistory = filteredHistory.filter(item => item.bill_type === selectedType);
        }
        
        // Filter by date range
        const selectedRange = filterDateRange.value;
        if (selectedRange !== 'all') {
            const today = new Date();
            let cutoffDate;
            
            if (selectedRange === 'week') {
                cutoffDate = new Date(today.setDate(today.getDate() - 7));
            } else if (selectedRange === 'month') {
                cutoffDate = new Date(today.setMonth(today.getMonth() - 1));
            } else if (selectedRange === 'year') {
                cutoffDate = new Date(today.setFullYear(today.getFullYear() - 1));
            }
            
            filteredHistory = filteredHistory.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= cutoffDate;
            });
        }
        
        return filteredHistory;
    }
    
    // Apply active filters to history
    function filterHistory() {
        updateHistoryTable();
        updateHistoryChart();
    }
    
    // Update history chart
    function updateHistoryChart(period = 'weekly') {
        // Destroy existing chart if it exists
        if (historyChartInstance) {
            historyChartInstance.destroy();
        }
        
        // Get filtered history data
        const filteredHistory = filterHistoryData();
        
        // Prepare data for the chart based on period
        let chartData;
        
        if (period === 'weekly') {
            chartData = prepareWeeklyChartData(filteredHistory);
        } else if (period === 'monthly') {
            chartData = prepareMonthlyChartData(filteredHistory);
        } else {
            chartData = prepareYearlyChartData(filteredHistory);
        }
        
        // Create a new chart
        historyChartInstance = new Chart(emissionsChart, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: chartData.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'CO2 Emissions (kg CO2e)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: period === 'weekly' ? 'Day' : (period === 'monthly' ? 'Month' : 'Year')
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            footer: function(tooltipItems) {
                                let totalEmissions = 0;
                                tooltipItems.forEach(item => {
                                    totalEmissions += item.parsed.y;
                                });
                                return `Total: ${totalEmissions.toFixed(2)} kg CO2e`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Prepare weekly chart data
    function prepareWeeklyChartData(history) {
        // Prepare empty datasets for each bill type
        const datasets = {
            food: {
                label: 'Food',
                data: Array(7).fill(0),
                backgroundColor: 'rgba(46, 204, 113, 0.7)',
                borderColor: 'rgba(39, 174, 96, 1)',
                borderWidth: 1
            },
            electricity: {
                label: 'Electricity',
                data: Array(7).fill(0),
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(41, 128, 185, 1)',
                borderWidth: 1
            },
            water: {
                label: 'Water',
                data: Array(7).fill(0),
                backgroundColor: 'rgba(0, 188, 212, 0.7)',
                borderColor: 'rgba(0, 151, 167, 1)',
                borderWidth: 1
            }
        };
        
        // Get the past 7 days
        const today = new Date();
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const day = new Date(today);
            day.setDate(day.getDate() - i);
            days.push(day.toISOString().split('T')[0]);
        }
        
        // Organize history data by day
        history.forEach(item => {
            const index = days.indexOf(item.date);
            if (index !== -1 && datasets[item.bill_type]) {
                datasets[item.bill_type].data[index] += item.emissions;
            }
        });
        
        // Format day labels for display
        const dayLabels = days.map(day => {
            const date = new Date(day);
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        });
        
        return {
            labels: dayLabels,
            datasets: Object.values(datasets)
        };
    }
    
    // Prepare monthly chart data
    function prepareMonthlyChartData(history) {
        // Prepare empty datasets for each bill type
        const datasets = {
            food: {
                label: 'Food',
                data: Array(12).fill(0),
                backgroundColor: 'rgba(46, 204, 113, 0.7)',
                borderColor: 'rgba(39, 174, 96, 1)',
                borderWidth: 1
            },
            electricity: {
                label: 'Electricity',
                data: Array(12).fill(0),
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(41, 128, 185, 1)',
                borderWidth: 1
            },
            water: {
                label: 'Water',
                data: Array(12).fill(0),
                backgroundColor: 'rgba(0, 188, 212, 0.7)',
                borderColor: 'rgba(0, 151, 167, 1)',
                borderWidth: 1
            }
        };
        
        // Organize history data by month
        history.forEach(item => {
            const date = new Date(item.date);
            const monthIndex = date.getMonth();
            
            if (datasets[item.bill_type]) {
                datasets[item.bill_type].data[monthIndex] += item.emissions;
            }
        });
        
        // Month labels
        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        return {
            labels: monthLabels,
            datasets: Object.values(datasets)
        };
    }
    
    // Prepare yearly chart data
    function prepareYearlyChartData(history) {
        // Get unique years from history
        const years = new Set();
        history.forEach(item => {
            const year = new Date(item.date).getFullYear();
            years.add(year);
        });
        
        // Sort years
        const sortedYears = Array.from(years).sort();
        
        // Prepare empty datasets for each bill type
        const datasets = {
            food: {
                label: 'Food',
                data: Array(sortedYears.length).fill(0),
                backgroundColor: 'rgba(46, 204, 113, 0.7)',
                borderColor: 'rgba(39, 174, 96, 1)',
                borderWidth: 1
            },
            electricity: {
                label: 'Electricity',
                data: Array(sortedYears.length).fill(0),
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(41, 128, 185, 1)',
                borderWidth: 1
            },
            water: {
                label: 'Water',
                data: Array(sortedYears.length).fill(0),
                backgroundColor: 'rgba(0, 188, 212, 0.7)',
                borderColor: 'rgba(0, 151, 167, 1)',
                borderWidth: 1
            }
        };
        
        // Organize history data by year
        history.forEach(item => {
            const year = new Date(item.date).getFullYear();
            const index = sortedYears.indexOf(year);
            
            if (index !== -1 && datasets[item.bill_type]) {
                datasets[item.bill_type].data[index] += item.emissions;
            }
        });
        
        return {
            labels: sortedYears.map(String),
            datasets: Object.values(datasets)
        };
    }
    
    // Update chart period
    function updateChartPeriod(period) {
        // Update active button
        document.querySelectorAll('.chart-toggle-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`toggle${period.charAt(0).toUpperCase() + period.slice(1)}`).classList.add('active');
        
        // Update chart
        updateHistoryChart(period);
    }
    
    // Update history summary
    function updateHistorySummary() {
        let totalEmissions = 0;
        let totalRewards = 0;
        
        emissionHistory.forEach(item => {
            totalEmissions += item.emissions;
            totalRewards += item.rewards;
        });
        
        // Calculate trees needed
        const treesNeeded = Math.ceil(totalEmissions / 25); // Assuming 25kg CO2 per tree per year
        
        // Update summary boxes
        historySummaryEmissions.textContent = `${totalEmissions.toFixed(2)} kg CO2e`;
        historySummaryRewards.textContent = `${totalRewards} points`;
        historySummaryTrees.textContent = `${treesNeeded} trees`;
    }
    
    // Update rewards status
    function updateRewardsStatus() {
        let totalRewards = 0;
        let totalEmissions = 0;
        
        emissionHistory.forEach(item => {
            totalRewards += item.rewards || 0;
            totalEmissions += item.emissions || 0;
        });
        
        // Update rewards summary
        updateRewardsLevel(totalRewards);
        
        // Calculate trees saved (1 tree per 100 points as an example)
        const treesSavedCount = Math.floor(totalRewards / 100);
        
        // Update tree visualization
        updateTreeVisualization(treesSavedCount);
        
        // Update rewards impact
        rewardsImpact.textContent = `${Math.ceil(totalEmissions / 25)} trees offset`;
    }
    
    // Update rewards level
    function updateRewardsLevel(points) {
        // Determine current level
        let currentLevel = 'beginner';
        let nextLevel = 'explorer';
        let nextLevelPoints = REWARDS_LEVELS.explorer.min;
        
        if (points >= REWARDS_LEVELS.champion.min) {
            currentLevel = 'champion';
            nextLevel = 'champion';
            nextLevelPoints = REWARDS_LEVELS.champion.min;
        } else if (points >= REWARDS_LEVELS.guardian.min) {
            currentLevel = 'guardian';
            nextLevel = 'champion';
            nextLevelPoints = REWARDS_LEVELS.champion.min;
        } else if (points >= REWARDS_LEVELS.explorer.min) {
            currentLevel = 'explorer';
            nextLevel = 'guardian';
            nextLevelPoints = REWARDS_LEVELS.guardian.min;
        }
        
        // Update level card highlighting
        document.querySelectorAll('.level-card').forEach(card => {
            card.style.transform = 'scale(1)';
            card.style.boxShadow = 'none';
        });
        
        const activeCard = document.querySelector(`.level-card[data-level="${currentLevel}"]`);
        if (activeCard) {
            activeCard.style.transform = 'scale(1.05)';
            activeCard.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
        }
        
        // Update level name
        rewardsLevel.textContent = `Eco ${currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}`;
        
        // Update points display
        rewardsSummaryPoints.textContent = `${points} points`;
        
        // Update progress bar
        let progressPercentage;
        if (currentLevel === 'champion') {
            progressPercentage = 100;
        } else {
            const levelMin = REWARDS_LEVELS[currentLevel].min;
            const progressRange = nextLevelPoints - levelMin;
            const userProgress = points - levelMin;
            progressPercentage = Math.min(100, (userProgress / progressRange) * 100);
        }
        
        levelProgressBar.style.width = `${progressPercentage}%`;
        
        // Update points to next level
        currentPoints.textContent = points;
        pointsToNextLevel.textContent = nextLevelPoints;
    }
    
    // Update tree visualization
    function updateTreeVisualization(count) {
        // Clear existing trees
        treeVisualization.innerHTML = '';
        
        // Add new trees (up to a maximum to avoid overwhelming the UI)
        const maxDisplayTrees = 20;
        const displayCount = Math.min(count, maxDisplayTrees);
        
        for (let i = 0; i < displayCount; i++) {
            const treeIcon = document.createElement('i');
            treeIcon.className = 'fas fa-tree tree-icon';
            treeIcon.style.animationDelay = `${i * 0.1}s`;
            treeVisualization.appendChild(treeIcon);
        }
        
        // Update counter
        treesSaved.textContent = count;
    }
    
    // Update rewards visualization
    function updateRewardsVisualization() {
        // Update rewards status
        updateRewardsStatus();
    }
    
    // Create emissions distribution chart
    function createEmissionsDistributionChart(data) {
        // Destroy existing chart if it exists
        if (distributionChartInstance) {
            distributionChartInstance.destroy();
        }
        
        // Prepare data for the chart
        const labels = [];
        const values = [];
        const colors = [];
        
        Object.keys(data).forEach(billType => {
            if (BILL_TYPES_INFO[billType]) {
                labels.push(BILL_TYPES_INFO[billType].name);
                values.push(data[billType].emissions);
                colors.push(BILL_TYPES_INFO[billType].color);
            }
        });
        
        // Create a new chart
        distributionChartInstance = new Chart(emissionDistribution, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value.toFixed(2)} kg CO2e (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Create accordion items for multiple bill analysis
    function createAccordionItems(results) {
        // Clear existing accordion items
        billsAccordion.innerHTML = '';
        
        // Create accordion items for each bill type
        Object.keys(results).forEach(billType => {
            if (BILL_TYPES_INFO[billType]) {
                const accordionItem = document.createElement('div');
                accordionItem.className = 'accordion-item';
                
                accordionItem.innerHTML = `
                    <div class="accordion-header">
                        <div class="accordion-title">
                            <i class="fas fa-${BILL_TYPES_INFO[billType].icon}" style="color: ${BILL_TYPES_INFO[billType].color}"></i>
                            ${BILL_TYPES_INFO[billType].name}
                        </div>
                        <div class="accordion-emissions">${results[billType].emissions.toFixed(2)} kg CO2e</div>
                        <i class="fas fa-chevron-down accordion-icon"></i>
                    </div>
                    <div class="accordion-content">
                        <div class="accordion-body">
                            ${results[billType].analysis}
                        </div>
                    </div>
                `;
                
                billsAccordion.appendChild(accordionItem);
                
                // Add event listener for accordion toggle
                const header = accordionItem.querySelector('.accordion-header');
                header.addEventListener('click', function() {
                    accordionItem.classList.toggle('active');
                });
            }
        });
    }
    
    // ---------- FORM HANDLING FUNCTIONS ----------
    
    // Handle single form submission
    function handleSingleFormSubmit(e) {
        e.preventDefault();
        
        // Get the bill type
        const billType = billTypeInput.value;
        
        // Validate form input
        const imageFile = document.getElementById(`${billType}ImageFile`).files[0];
        
        if (!imageFile) {
            alert(`Please upload a ${billType} bill image to analyze.`);
            return;
        }
        
        // Show loading indicator
        loadingIndicator.style.display = 'block';
        analysisResults.style.display = 'none';
        
        // Create form data
        const formData = new FormData(emissionForm);
        
        // Send the form data to the server
        fetch('/analyze-bill', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
            
            if (data.success) {
                // Store current analysis
                currentAnalysis = {
                    date: new Date().toISOString().split('T')[0],
                    bill_type: data.bill_type,
                    description: `${BILL_TYPES_INFO[data.bill_type].name} bill analysis`,
                    emissions: data.emissions,
                    unit: 'kg CO2e',
                    rewards: data.rewards.points,
                    trees_needed: data.trees_needed,
                    analysis: data.analysis
                };
                
                // Display results
                resultsContent.innerHTML = formatAnalysisText(data.analysis);
                treesCount.textContent = Math.ceil(data.trees_needed);
                rewardsPoints.textContent = data.rewards.points;
                rewardsMessage.textContent = data.rewards.message;
                analysisResults.style.display = 'block';
                
                // Scroll to results
                analysisResults.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            loadingIndicator.style.display = 'none';
            alert('An error occurred. Please try again.');
        });
    }
    
    // Handle multiple form submission
    function handleMultipleFormSubmit(e) {
        e.preventDefault();
        
        // Validate that at least one bill type is selected
        if (!includeFoodBill.checked && !includeElectricityBill.checked && !includeWaterBill.checked) {
            alert('Please select at least one bill type to analyze.');
            return;
        }
        
        // For each selected bill type, ensure there's an image
        let hasValidInput = false;
        
        if (includeFoodBill.checked) {
            const hasImage = foodImageFileMultiple.files.length > 0;
            if (hasImage) hasValidInput = true;
            else if (includeFoodBill.checked) {
                alert('Please upload a food bill image.');
                return;
            }
        }
        
        if (includeElectricityBill.checked) {
            const hasImage = electricityImageFileMultiple.files.length > 0;
            if (hasImage) hasValidInput = true;
            else if (includeElectricityBill.checked) {
                alert('Please upload an electricity bill image.');
                return;
            }
        }
        
        if (includeWaterBill.checked) {
            const hasImage = waterImageFileMultiple.files.length > 0;
            if (hasImage) hasValidInput = true;
            else if (includeWaterBill.checked) {
                alert('Please upload a water bill image.');
                return;
            }
        }
        
        if (!hasValidInput) {
            alert('Please upload at least one bill image for analysis.');
            return;
        }
        
        // Show loading indicator
        multipleLoadingIndicator.style.display = 'block';
        multipleAnalysisResults.style.display = 'none';
        
        // Create form data
        const formData = new FormData(multipleBillsForm);
        
        // Send the form data to the server
        fetch('/analyze-multiple', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading indicator
            multipleLoadingIndicator.style.display = 'none';
            
            if (data.success) {
                // Store current multiple analysis
                currentMultipleAnalysis = {
                    date: new Date().toISOString().split('T')[0],
                    results: data.results,
                    total_emissions: data.total_emissions,
                    total_rewards: data.total_rewards,
                    total_trees_needed: data.total_trees_needed
                };
                
                // Update total emissions display
                totalEmissionsValue.textContent = data.total_emissions.toFixed(2);
                
                // Create emissions distribution chart
                createEmissionsDistributionChart(data.results);
                
                // Create accordion items
                createAccordionItems(data.results);
                
                // Update trees and rewards
                multipleTreesToPlant.textContent = Math.ceil(data.total_trees_needed);
                totalRewardsPoints.textContent = data.total_rewards;
                
                // Show results
                multipleAnalysisResults.style.display = 'block';
                
                // Scroll to results
                multipleAnalysisResults.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            multipleLoadingIndicator.style.display = 'none';
            alert('An error occurred. Please try again.');
        });
    }
    
    // Format analysis text for display
    function formatAnalysisText(text) {
        // Remove any markdown code block indicators if they somehow got through
        text = text.replace(/```html/g, '').replace(/```/g, '');
        
        // If the text already contains HTML elements (our new format)
        if (text.includes('<div') || text.includes('<table')) {
            return text;
        }
        
        // Otherwise, apply basic formatting for non-HTML responses
        // Convert line breaks to <br> tags
        let formattedText = text.replace(/\n/g, '<br>');
        
        // Make headings stand out
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<h4>$1</h4>');
        
        return formattedText;
    }
    
    // Save single results to history
    function saveSingleResultsToHistory() {
        if (currentAnalysis) {
            // Add to local history array
            emissionHistory.push(currentAnalysis);
            
            // Update UI
            updateHistoryTable();
            updateHistoryChart();
            updateHistorySummary();
            updateRewardsStatus();
            
            // In a real app, you would also send this to the server
            
            // Show confirmation
            alert('Analysis saved to history!');
            
            // Reset form
            resetSingleAnalysisForm();
            
            // Navigate to history section
            document.querySelector('nav ul li a[href="#history"]').click();
        }
    }
    
    // Save multiple results to history
    function saveMultipleResultsToHistory() {
        if (currentMultipleAnalysis) {
            // Add individual entries to history
            Object.keys(currentMultipleAnalysis.results).forEach(billType => {
                const result = currentMultipleAnalysis.results[billType];
                
                emissionHistory.push({
                    date: currentMultipleAnalysis.date,
                    bill_type: billType,
                    description: `${BILL_TYPES_INFO[billType].name} analysis (multiple)`,
                    emissions: result.emissions,
                    unit: 'kg CO2e',
                    rewards: result.rewards.points,
                    trees_needed: result.trees_needed,
                    analysis: result.analysis
                });
            });
            
            // Update UI
            updateHistoryTable();
            updateHistoryChart();
            updateHistorySummary();
            updateRewardsStatus();
            
            // In a real app, you would also send this to the server
            
            // Show confirmation
            alert('Multiple analysis saved to history!');
            
            // Reset form
            resetMultipleAnalysisForm();
            
            // Navigate to history section
            document.querySelector('nav ul li a[href="#history"]').click();
        }
    }
    
    // Reset single analysis form
    function resetSingleAnalysisForm() {
        emissionForm.reset();
        document.querySelectorAll('[id$="ImagePreview"]').forEach(preview => {
            preview.style.display = 'none';
        });
        analysisResults.style.display = 'none';
        currentAnalysis = null;
    }
    
    // Reset multiple analysis form
    function resetMultipleAnalysisForm() {
        multipleBillsForm.reset();
        document.querySelectorAll('[id$="ImagePreviewMultiple"]').forEach(preview => {
            preview.style.display = 'none';
        });
        multipleAnalysisResults.style.display = 'none';
        currentMultipleAnalysis = null;
        
        // Reset bill content visibility
        foodBillContent.style.display = 'block';
        electricityBillContent.style.display = 'none';
        waterBillContent.style.display = 'none';
    }
    
    // ---------- HISTORY FUNCTIONS ----------
    
    // View history item
    function viewHistoryItem(index) {
        const item = emissionHistory[index];
        
        if (item) {
            // Switch to the appropriate bill type
            document.querySelectorAll('.bill-type-button').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-bill-type') === item.bill_type) {
                    btn.click(); // This will trigger the click event handler
                }
            });
            
            // Display results
            resultsContent.innerHTML = formatAnalysisText(item.analysis);
            treesCount.textContent = Math.ceil(item.trees_needed || (item.emissions / 25));
            rewardsPoints.textContent = item.rewards || 0;
            rewardsMessage.textContent = ''; // No message for historical items
            analysisResults.style.display = 'block';
            
            // Navigate to home section
            document.querySelector('nav ul li a[href="#home"]').click();
            
            // Scroll to results
            analysisResults.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    // Delete history item
    function deleteHistoryItem(index) {
        if (confirm('Are you sure you want to delete this item from your history?')) {
            // Remove from local array
            emissionHistory.splice(index, 1);
            
            // Update UI
            updateHistoryTable();
            updateHistoryChart();
            updateHistorySummary();
            updateRewardsStatus();
            
            // In a real app, you would also send this to the server
        }
    }
});