// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    const navLinks = document.querySelectorAll('nav ul li a');
    const sections = document.querySelectorAll('main section');
    
    // Form elements
    const foodEmissionForm = document.getElementById('foodEmissionForm');
    const imageFileInput = document.getElementById('imageFile');
    const imagePreview = document.getElementById('imagePreview');
    const textDescription = document.getElementById('textDescription');
    
    // Results elements
    const loadingIndicator = document.getElementById('loadingIndicator');
    const analysisResults = document.getElementById('analysisResults');
    const resultsContent = document.getElementById('resultsContent');
    const saveResultsBtn = document.getElementById('saveResultsBtn');
    const newAnalysisBtn = document.getElementById('newAnalysisBtn');
    
    // History elements
    const historyTableBody = document.getElementById('historyTableBody');
    const emissionsChart = document.getElementById('emissionsChart');
    
    // User's emission history
    let emissionHistory = [];
    
    // Current analysis results
    let currentAnalysis = null;
    
    // Charts
    let historyChartInstance = null;
    
    // Initialize the application
    initApp();
    
    // ---------- INITIALIZATION FUNCTIONS ----------
    
    // Initialize the application
    function initApp() {
        // Set up navigation
        setupNavigation();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load emission history
        fetchEmissionHistory();
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
            });
        });
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Image file input change
        imageFileInput.addEventListener('change', handleImageUpload);
        
        // Form submission
        foodEmissionForm.addEventListener('submit', handleFormSubmit);
        
        // Save results button
        saveResultsBtn.addEventListener('click', saveResultsToHistory);
        
        // New analysis button
        newAnalysisBtn.addEventListener('click', resetAnalysisForm);
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
            })
            .catch(error => console.error('Error fetching emission history:', error));
    }
    
    // ---------- UI UPDATE FUNCTIONS ----------
    
    // Handle image upload preview
    function handleImageUpload(e) {
        const file = e.target.files[0];
        
        if (file) {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                imagePreview.src = event.target.result;
                imagePreview.style.display = 'block';
            };
            
            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = 'none';
        }
    }
    
    // Update history table
    function updateHistoryTable() {
        historyTableBody.innerHTML = '';
        
        emissionHistory.forEach((item, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${item.date}</td>
                <td>${item.description}</td>
                <td>${item.emissions} ${item.unit}</td>
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
                const index = this.getAttribute('data-index');
                viewHistoryItem(index);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                deleteHistoryItem(index);
            });
        });
    }
    
    // Update history chart
    function updateHistoryChart() {
        // Destroy existing chart if it exists
        if (historyChartInstance) {
            historyChartInstance.destroy();
        }
        
        // Prepare data for the chart
        const dates = emissionHistory.map(item => item.date);
        const emissions = emissionHistory.map(item => item.emissions);
        
        // Create a new chart
        historyChartInstance = new Chart(emissionsChart, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [{
                    label: 'CO2 Emissions (kg CO2e)',
                    data: emissions,
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    borderColor: 'rgba(39, 174, 96, 1)',
                    borderWidth: 1
                }]
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
                            text: 'Date'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const index = context.dataIndex;
                                return emissionHistory[index].description;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // ---------- FORM HANDLING FUNCTIONS ----------
    
    // Handle form submission
    function handleFormSubmit(e) {
        e.preventDefault();
        
        // Validate form input
        if (!imageFileInput.files[0] && textDescription.value.trim() === '') {
            alert('Please either upload a food bill image or provide a meal description.');
            return;
        }
        
        // Show loading indicator
        loadingIndicator.style.display = 'block';
        analysisResults.style.display = 'none';
        
        // Create form data
        const formData = new FormData(foodEmissionForm);
        
        // Send the form data to the server
        fetch('/analyze-food', {
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
                    description: formData.get('text_description') || 'Food bill image analysis',
                    // Extract emissions value from analysis text (this is a simplification)
                    emissions: extractEmissionsValue(data.analysis),
                    unit: 'kg CO2e',
                    analysis: data.analysis
                };
                
                // Display results
                resultsContent.innerHTML = formatAnalysisText(data.analysis);
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
    
    // Extract emissions value from analysis text (simplified implementation)
    function extractEmissionsValue(analysisText) {
        // This is a very simplified way to extract emissions value
        // In a real app, you would want a more robust implementation
        // or have the server return this value separately
        
        // Look for patterns like "X.XX kg CO2e" or "total emissions: X.XX"
        const emissionRegex = /(\d+\.\d+)\s*kg\s*CO2e/i;
        const totalRegex = /total\s*emissions:?\s*(\d+\.\d+)/i;
        
        let match = emissionRegex.exec(analysisText) || totalRegex.exec(analysisText);
        
        if (match && match[1]) {
            return parseFloat(match[1]);
        }
        
        // Return a random value between 1 and 10 if no value found (for demo purposes)
        return Math.round((Math.random() * 9 + 1) * 10) / 10;
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
    
    // Save results to history
    function saveResultsToHistory() {
        if (currentAnalysis) {
            // Add to local history array
            emissionHistory.push(currentAnalysis);
            
            // Update UI
            updateHistoryTable();
            updateHistoryChart();
            
            // In a real app, you would also send this to the server
            
            // Show confirmation
            alert('Analysis saved to history!');
            
            // Reset form
            resetAnalysisForm();
            
            // Navigate to history section
            document.querySelector('nav ul li a[href="#history"]').click();
        }
    }
    
    // Reset analysis form
    function resetAnalysisForm() {
        foodEmissionForm.reset();
        imagePreview.style.display = 'none';
        analysisResults.style.display = 'none';
    }
    
    // ---------- HISTORY FUNCTIONS ----------
    
    // View history item
    function viewHistoryItem(index) {
        const item = emissionHistory[index];
        
        if (item) {
            // Display results
            resultsContent.innerHTML = formatAnalysisText(item.analysis);
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
            
            // In a real app, you would also send this to the server
        }
    }
});