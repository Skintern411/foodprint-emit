document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const usersTableBody = document.getElementById('usersTableBody');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const noResults = document.getElementById('noResults');
    const userSearch = document.getElementById('userSearch');
    const searchBtn = document.getElementById('searchBtn');
    const filterPoints = document.getElementById('filterPoints');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const totalUsers = document.getElementById('totalUsers');
    const totalPoints = document.getElementById('totalPoints');
    const activeUsers = document.getElementById('activeUsers');
    const sortableHeaders = document.querySelectorAll('th.sortable');
    
    // User Modal Elements
    const userModal = document.getElementById('userModal');
    const closeModal = document.querySelector('.close-modal');
    const modalUserName = document.getElementById('modalUserName');
    const modalUserId = document.getElementById('modalUserId');
    const modalUserPhone = document.getElementById('modalUserPhone');
    const modalUserPoints = document.getElementById('modalUserPoints');
    const modalUserLevel = document.getElementById('modalUserLevel');
    const modalUserJoinDate = document.getElementById('modalUserJoinDate');
    const modalUserLastActivity = document.getElementById('modalUserLastActivity');
    const userPointsChart = document.getElementById('userPointsChart');
    
    // Delete Confirmation Modal Elements
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const deleteUserName = document.getElementById('deleteUserName');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const closeDeleteModal = deleteConfirmModal ? deleteConfirmModal.querySelector('.close-modal') : null;
    
    // State variables
    let userData = [];
    let filteredData = [];
    let currentPage = 1;
    let itemsPerPage = 10;
    let totalPages = 1;
    let currentSort = { column: 'points', direction: 'desc' };
    let searchTerm = '';
    let pointsFilter = 'all';
    let chartInstance = null;
    let userToDelete = null;
    
    // Initialize
    init();
    
    // Initialize the admin panel
    function init() {
        // Load user data
        fetchUserData();
        
        // Set up event listeners
        setupEventListeners();
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Search functionality
        searchBtn.addEventListener('click', function() {
            searchTerm = userSearch.value.trim().toLowerCase();
            currentPage = 1;
            filterAndDisplayUsers();
        });
        
        userSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchTerm = userSearch.value.trim().toLowerCase();
                currentPage = 1;
                filterAndDisplayUsers();
            }
        });
        
        // Points filter
        filterPoints.addEventListener('change', function() {
            pointsFilter = this.value;
            currentPage = 1;
            filterAndDisplayUsers();
        });
        
        // Pagination
        prevPage.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                displayUserPage();
            }
        });
        
        nextPage.addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                displayUserPage();
            }
        });
        
        // Sortable columns
        sortableHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const column = this.getAttribute('data-sort');
                
                // If clicking the same column, toggle direction
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    // New column, set to ascending by default
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }
                
                // Update visual indicators
                updateSortIndicators();
                
                // Sort and display
                sortUsers();
                displayUserPage();
            });
        });
        
        // User Modal Close
        if (closeModal) {
            closeModal.addEventListener('click', function() {
                userModal.style.display = 'none';
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === userModal) {
                userModal.style.display = 'none';
            }
            if (event.target === deleteConfirmModal) {
                deleteConfirmModal.style.display = 'none';
                userToDelete = null;
            }
        });
        
        // Delete confirmation modal event listeners
        if (deleteConfirmModal) {
            // Cancel delete button
            if (cancelDeleteBtn) {
                cancelDeleteBtn.addEventListener('click', function() {
                    deleteConfirmModal.style.display = 'none';
                    userToDelete = null;
                });
            }
            
            // Confirm delete button
            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', function() {
                    if (userToDelete) {
                        deleteUser(userToDelete.id);
                    }
                });
            }
            
            // Close delete modal with X button
            if (closeDeleteModal) {
                closeDeleteModal.addEventListener('click', function() {
                    deleteConfirmModal.style.display = 'none';
                    userToDelete = null;
                });
            }
        }
    }
    
    // Fetch user data from the server
    function fetchUserData() {
        loadingIndicator.style.display = 'block';
        usersTableBody.innerHTML = '';
        noResults.style.display = 'none';
        
        fetch('/admin/users')
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || `Server error: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Unknown error occurred');
                }
                
                if (data.users && Array.isArray(data.users)) {
                    userData = data.users;
                    filteredData = [...userData];
                    
                    // Update dashboard summary
                    updateDashboardSummary();
                    
                    // Set initial sort
                    sortUsers();
                    
                    // Display first page
                    displayUserPage();
                    
                    // Hide loading indicator
                    loadingIndicator.style.display = 'none';
                    
                    if (userData.length === 0) {
                        noResults.style.display = 'block';
                        noResults.querySelector('p').textContent = 'No users found in the database.';
                    }
                } else {
                    throw new Error('Invalid data format received');
                }
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                loadingIndicator.style.display = 'none';
                noResults.style.display = 'block';
                noResults.querySelector('p').textContent = `Error loading user data: ${error.message}`;
            });
    }    
    
    // Update dashboard summary
    function updateDashboardSummary() {
        totalUsers.textContent = userData.length;
        
        let pointsSum = 0;
        let activeCount = 0;
        
        userData.forEach(user => {
            pointsSum += user.points;
            if (user.active) {
                activeCount++;
            }
        });
        
        totalPoints.textContent = pointsSum.toLocaleString();
        activeUsers.textContent = activeCount;
    }
    
    // Filter and display users based on search and filter
    function filterAndDisplayUsers() {
        // Apply filters
        filteredData = userData.filter(user => {
            // Search by name or ID - make it more effective for name search
            const matchesSearch = searchTerm === '' || 
                                user.name.toLowerCase().includes(searchTerm) || 
                                user.id.toString().includes(searchTerm) ||
                                (user.phone && user.phone.includes(searchTerm));
            
            // Filter by points
            let matchesPointsFilter = true;
            
            if (pointsFilter !== 'all') {
                if (pointsFilter === '0-100') {
                    matchesPointsFilter = user.points >= 0 && user.points <= 100;
                } else if (pointsFilter === '101-500') {
                    matchesPointsFilter = user.points >= 101 && user.points <= 500;
                } else if (pointsFilter === '501-1000') {
                    matchesPointsFilter = user.points >= 501 && user.points <= 1000;
                } else if (pointsFilter === '1000+') {
                    matchesPointsFilter = user.points > 1000;
                }
            }
            
            return matchesSearch && matchesPointsFilter;
        });
        
        // Sort the filtered data
        sortUsers();
        
        // Reset to first page
        currentPage = 1;
        
        // Display the users
        displayUserPage();
    }
    
    // Sort users based on current sort settings
    function sortUsers() {
        filteredData.sort((a, b) => {
            let valueA, valueB;
            
            // Get the values to compare based on sort column
            switch(currentSort.column) {
                case 'id':
                    valueA = parseInt(a.id);
                    valueB = parseInt(b.id);
                    break;
                case 'name':
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
                    break;
                case 'points':
                    valueA = parseInt(a.points);
                    valueB = parseInt(b.points);
                    break;
                case 'level':
                    valueA = getLevelValue(a.points);
                    valueB = getLevelValue(b.points);
                    break;
                default:
                    valueA = a[currentSort.column];
                    valueB = b[currentSort.column];
            }
            
            // Compare the values
            if (valueA < valueB) {
                return currentSort.direction === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return currentSort.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }
    
    // Update sort indicators in the table header
    function updateSortIndicators() {
        sortableHeaders.forEach(header => {
            const column = header.getAttribute('data-sort');
            
            // Remove existing sort classes
            header.classList.remove('sort-asc', 'sort-desc');
            
            // Add the appropriate class if this is the current sort column
            if (column === currentSort.column) {
                header.classList.add(`sort-${currentSort.direction}`);
            }
        });
    }
    
    // Display the current page of users
    function displayUserPage() {
        // Clear the table
        usersTableBody.innerHTML = '';
        
        // Calculate total pages
        totalPages = Math.ceil(filteredData.length / itemsPerPage);
        
        // Update page info
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        
        // Enable/disable pagination buttons
        prevPage.disabled = currentPage === 1;
        nextPage.disabled = currentPage === totalPages || totalPages === 0;
        
        // Show message if no results
        if (filteredData.length === 0) {
            noResults.style.display = 'block';
            return;
        } else {
            noResults.style.display = 'none';
        }
        
        // Calculate start and end indices
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
        
        // Create the table rows
        for (let i = startIndex; i < endIndex; i++) {
            const user = filteredData[i];
            createUserRow(user);
        }
    }
    
    // Create a row for a user
    function createUserRow(user) {
        const row = document.createElement('tr');
        
        // Determine user level
        const level = getUserLevel(user.points);
        const levelClass = `level-${level.toLowerCase()}`;
        
        // Format phone number for display (mask middle digits)
        const maskedPhone = maskPhoneNumber(user.phone);
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${maskedPhone}</td>
            <td>${user.points}</td>
            <td><span class="user-level ${levelClass}">${level}</span></td>
            <td class="table-actions">
                <button class="action-btn view-btn" data-id="${user.id}" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn delete-btn" data-id="${user.id}" data-name="${user.name}" title="Delete User">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        usersTableBody.appendChild(row);
        
        // Add event listener to view button
        const viewBtn = row.querySelector('.view-btn');
        viewBtn.addEventListener('click', function() {
            showUserDetails(user);
        });
        
        // Add event listener to delete button
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            showDeleteConfirmation(user);
        });
    }
    
    // Mask phone number (show only first 2 and last 2 digits)
    function maskPhoneNumber(phone) {
        if (!phone || phone.length < 5) return phone;
        
        const firstTwo = phone.substring(0, 2);
        const lastTwo = phone.substring(phone.length - 2);
        const masked = '*'.repeat(phone.length - 4);
        
        return `${firstTwo}${masked}${lastTwo}`;
    }
    
    // Show user details in modal
    function showUserDetails(user) {
        // Set user info in modal
        modalUserName.textContent = user.name;
        modalUserId.textContent = user.id;
        modalUserPhone.textContent = maskPhoneNumber(user.phone);
        modalUserPoints.textContent = user.points;
        
        // Determine and set user level
        const level = getUserLevel(user.points);
        modalUserLevel.textContent = `Eco ${level}`;
        modalUserLevel.className = `user-level level-${level.toLowerCase()}`;
        
        // Set join date and last activity
        modalUserJoinDate.textContent = user.join_date || 'N/A';
        modalUserLastActivity.textContent = user.last_activity || 'N/A';
        
        // Create chart for points history
        createPointsHistoryChart(user);
        
        // Show the modal
        userModal.style.display = 'block';
    }
    
    // Show delete confirmation modal
    function showDeleteConfirmation(user) {
        userToDelete = user;
        deleteUserName.textContent = user.name;
        deleteConfirmModal.style.display = 'block';
    }
    
    // Delete user function
    function deleteUser(userId) {
        fetch(`/admin/delete-user/${userId}`, {
            method: 'DELETE',
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove user from the local data
                userData = userData.filter(user => user.id !== userId);
                filteredData = filteredData.filter(user => user.id !== userId);
                
                // Update dashboard summary
                updateDashboardSummary();
                
                // Display current page or first page if current page is empty
                if ((currentPage - 1) * itemsPerPage >= filteredData.length && currentPage > 1) {
                    currentPage--;
                }
                displayUserPage();
                
                // Show success notification
                alert(`User "${userToDelete.name}" has been successfully deleted.`);
            } else {
                alert(`Error: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            alert('An error occurred while deleting the user. Please try again.');
        })
        .finally(() => {
            // Close the modal
            deleteConfirmModal.style.display = 'none';
            userToDelete = null;
        });
    }
    
    // Create points history chart
    function createPointsHistoryChart(user) {
        // Clean up any existing chart
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        // Sample data - In a real app, you would fetch this from the server
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const pointsHistory = generateSamplePointsHistory(user.points);
        
        // Create the chart
        const ctx = userPointsChart.getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Points',
                    data: pointsHistory,
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(46, 204, 113, 1)',
                    pointRadius: 4
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
                            text: 'Points'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Generate sample points history for demo
    function generateSamplePointsHistory(totalPoints) {
        const history = [];
        let accumulatedPoints = 0;
        const increment = totalPoints / 12;
        
        for (let i = 0; i < 12; i++) {
            // Add some randomness to the increment
            const randomFactor = 0.5 + Math.random();
            accumulatedPoints += increment * randomFactor;
            
            // Ensure we don't exceed total points
            if (i === 11) {
                history.push(totalPoints);
            } else {
                history.push(Math.min(Math.round(accumulatedPoints), totalPoints));
            }
        }
        
        return history;
    }
    
    // Get user level based on points
    function getUserLevel(points) {
        if (points >= 1000) {
            return 'Champion';
        } else if (points >= 500) {
            return 'Guardian';
        } else if (points >= 100) {
            return 'Explorer';
        } else {
            return 'Beginner';
        }
    }
    
    // Get numeric value for level for sorting purposes
    function getLevelValue(points) {
        if (points >= 1000) {
            return 4;
        } else if (points >= 500) {
            return 3;
        } else if (points >= 100) {
            return 2;
        } else {
            return 1;
        }
    }
});
