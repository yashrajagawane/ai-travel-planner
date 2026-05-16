document.addEventListener('DOMContentLoaded', () => {

    // --- SHARED TOAST NOTIFICATION ---
    function showToast(message, isSuccess = true) {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.className = 'toast-notification';

        const successColor = 'rgba(16, 185, 129, 0.9)'; // Green
        const errorColor = 'rgba(239, 68, 68, 0.9)'; // Red

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: isSuccess ? successColor : errorColor,
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            zIndex: '2000',
            opacity: '0',
            transition: 'opacity 0.4s ease, bottom 0.4s ease'
        });

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.bottom = '30px';
        }, 10);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.bottom = '20px';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 500);
        }, 3500);
    }

    // --- DELETE PLAN LOGIC ---
    const confirmModal = document.getElementById('confirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    let planIdToDelete = null;

    function showConfirmModal() {
        if (confirmModal) confirmModal.classList.add('visible');
    }

    function hideConfirmModal() {
        if (confirmModal) confirmModal.classList.remove('visible');
        planIdToDelete = null;
    }

    if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', hideConfirmModal);
    if (confirmModal) confirmModal.addEventListener('click', (event) => {
        if (event.target === confirmModal) hideConfirmModal();
    });

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!planIdToDelete) return;

            try {
                const response = await fetch(`/delete_plan/${planIdToDelete}`, {
                    method: 'DELETE',
                });
                const result = await response.json();

                if (result.success) {
                    const cardToDelete = document.getElementById(`plan-card-${planIdToDelete}`);
                    if (cardToDelete) {
                        cardToDelete.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                        cardToDelete.style.opacity = '0';
                        cardToDelete.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            cardToDelete.remove();
                            if (document.querySelectorAll('.plan-card').length === 0) {
                                // Reload to show the "No plans" message
                                location.reload();
                            }
                        }, 500);
                    }
                    showToast(result.message, true);
                } else {
                    showToast(result.message || 'Failed to delete plan.', false);
                }
            } catch (error) {
                console.error('Error deleting plan:', error);
                showToast('An error occurred.', false);
            } finally {
                hideConfirmModal();
            }
        });
    }

    // --- EDIT & DELETE BUTTON EVENT LISTENER ---
    document.body.addEventListener('click', async (event) => {
        const target = event.target.closest('.delete-btn, .edit-btn');
        if (!target) return;

        const planId = target.dataset.planId;
        const planCard = document.getElementById(`plan-card-${planId}`);
        if (!planCard) return;

        // Handle Delete Button click
        if (target.classList.contains('delete-btn')) {
            planIdToDelete = planId;
            showConfirmModal();
        }

        // Handle Edit Button click
        if (target.classList.contains('edit-btn')) {
            const currentLocation = planCard.querySelector('.plan-location').textContent;
            const destination = planCard.querySelector('.plan-destination').textContent.replace('Trip to ', '');
            const date = planCard.querySelector('.plan-date').textContent;
            const budget = planCard.querySelector('.plan-budget').textContent.replace('Not Set', '').trim();

            // Prompt for new values
            const newLocation = prompt("Update current location:", currentLocation);
            const newDestination = prompt("Update destination:", destination);
            const newDate = prompt("Update date (YYYY-MM-DD):", date);
            const newBudget = prompt("Update budget:", budget);

            if (newLocation === null || newDestination === null || newDate === null || newBudget === null) {
                return; // User cancelled one of the prompts
            }
            if (!newLocation.trim() || !newDestination.trim() || !newDate.trim()) {
                showToast("Location, destination, and date must be filled out.", false);
                return;
            }

            const updatedData = {
                current_location: newLocation,
                destination: newDestination,
                date: newDate,
                budget: newBudget.trim() || 'Not Set' // Save budget or 'Not Set'
            };

            try {
                const response = await fetch(`/update_plan/${planId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });
                const result = await response.json();

                if (result.success) {
                    showToast(result.message, true);
                    // Update the card on the page
                    planCard.querySelector('.plan-location').textContent = newLocation;
                    planCard.querySelector('.plan-destination').textContent = `Trip to ${newDestination}`;
                    planCard.querySelector('.plan-date').textContent = newDate;
                    planCard.querySelector('.plan-budget').textContent = newBudget.trim() || 'Not Set';
                } else {
                    showToast(result.message || 'Failed to update plan.', false);
                }
            } catch (error) {
                console.error('Error updating plan:', error);
                showToast('An error occurred during the update.', false);
            }
        }
    });
});

