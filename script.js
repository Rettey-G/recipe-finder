const apiKey = 'ccd743c843394e0ca0710618578d9550';
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const customIngredient = document.getElementById('custom-ingredient');
const addCustomButton = document.getElementById('add-custom');
const selectedList = document.getElementById('selected-list');
const recipeList = document.getElementById('recipe-list');
const generateButton = document.getElementById('generate-recipes');

let selectedIngredients = [];
let favoriteRecipes = JSON.parse(localStorage.getItem('favoriteRecipes')) || [];

// Initialize category items
document.querySelectorAll('.category li').forEach(item => {
    item.addEventListener('click', () => {
        const ingredient = item.textContent.trim();
        toggleIngredient(ingredient);
    });
});

// Search functionality
searchButton.addEventListener('click', searchIngredients);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') searchIngredients();
});

function searchIngredients() {
    const query = searchInput.value.toLowerCase();
    document.querySelectorAll('.category li').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'block' : 'none';
    });
}

// Custom ingredient handling
addCustomButton.addEventListener('click', () => {
    const ingredient = customIngredient.value.trim();
    if (ingredient && !selectedIngredients.includes(ingredient)) {
        toggleIngredient(ingredient);
        customIngredient.value = '';
    }
});

customIngredient.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        addCustomButton.click();
    }
});

// Ingredient management
function toggleIngredient(ingredient) {
    const index = selectedIngredients.indexOf(ingredient);
    if (index === -1) {
        selectedIngredients.push(ingredient);
        showToast(`Added ${ingredient} to your ingredients!`);
    } else {
        selectedIngredients.splice(index, 1);
        showToast(`Removed ${ingredient} from your ingredients!`);
    }
    renderSelectedIngredients();
    saveToLocalStorage();
}

function renderSelectedIngredients() {
    selectedList.innerHTML = '';
    selectedIngredients.forEach(ingredient => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${ingredient}
            <button onclick="removeIngredient('${ingredient}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        selectedList.appendChild(li);
    });
}

function removeIngredient(ingredient) {
    const index = selectedIngredients.indexOf(ingredient);
    if (index !== -1) {
        selectedIngredients.splice(index, 1);
        renderSelectedIngredients();
        saveToLocalStorage();
        showToast(`Removed ${ingredient} from your ingredients!`);
    }
}

// Local Storage Management
function saveToLocalStorage() {
    localStorage.setItem('selectedIngredients', JSON.stringify(selectedIngredients));
    localStorage.setItem('favoriteRecipes', JSON.stringify(favoriteRecipes));
}

function loadFromLocalStorage() {
    const savedIngredients = localStorage.getItem('selectedIngredients');
    if (savedIngredients) {
        selectedIngredients = JSON.parse(savedIngredients);
        renderSelectedIngredients();
    }
}

// Recipe generation
generateButton.addEventListener('click', function() {
    if (selectedIngredients.length === 0) {
        showToast('Please select some ingredients first!');
        recipeList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <p>Select ingredients to discover recipes!</p>
            </div>`;
        return;
    }

    this.classList.add('loading');
    const btnText = this.querySelector('.btn-text');
    const originalText = btnText.textContent;
    btnText.textContent = '🪄 Creating Magic...';

    showLoadingState();
    findRecipes().then(() => {
        this.classList.remove('loading');
        btnText.textContent = originalText;
    });
});

function showLoadingState() {
    recipeList.innerHTML = `
        <div class="loading-animation">
            <div class="cooking-pot">
                <i class="fas fa-mortar-pestle"></i>
                <div class="steam"></div>
            </div>
            <p>Brewing your magical recipes...</p>
        </div>`;
}

async function findRecipes() {
    const params = new URLSearchParams({
        ingredients: selectedIngredients.join(','),
        number: 12,
        ranking: 2,
        ignorePantry: true,
        apiKey: apiKey
    });

    try {
        const response = await fetch(`https://api.spoonacular.com/recipes/findByIngredients?${params}`);
        const recipes = await response.json();
        const categorizedRecipes = await categorizeRecipes(recipes);
        displayRecipes(categorizedRecipes);
    } catch (error) {
        handleError();
    }
}

async function categorizeRecipes(recipes) {
    const categorizedRecipes = {
        food: [],
        drinks: []
    };

    for (const recipe of recipes) {
        const details = await getRecipeDetails(recipe.id);
        if (details.dishTypes.includes('drink') || details.dishTypes.includes('beverage')) {
            categorizedRecipes.drinks.push({...recipe, details});
        } else {
            categorizedRecipes.food.push({...recipe, details});
        }
    }

    return categorizedRecipes;
}

async function getRecipeDetails(recipeId) {
    const response = await fetch(
        `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${apiKey}`
    );
    return await response.json();
}

function displayRecipes(categorizedRecipes) {
    if (!categorizedRecipes.food.length && !categorizedRecipes.drinks.length) {
        recipeList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No recipes found with these ingredients.</p>
            </div>`;
        return;
    }

    recipeList.innerHTML = `
        ${categorizedRecipes.food.length ? `
            <div class="recipe-category">
                <h2 class="recipe-category-title">🍽️ Food Recipes</h2>
                <div class="recipe-grid">
                    ${categorizedRecipes.food.map(recipe => createRecipeCard(recipe)).join('')}
                </div>
            </div>
        ` : ''}
        
        ${categorizedRecipes.drinks.length ? `
            <div class="recipe-category">
                <h2 class="recipe-category-title">🍹 Drink Recipes</h2>
                <div class="recipe-grid">
                    ${categorizedRecipes.drinks.map(recipe => createRecipeCard(recipe)).join('')}
                </div>
            </div>
        ` : ''}
    `;

    document.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.favorite-btn')) {
                const recipeId = card.dataset.recipeId;
                showRecipeDetails(recipeId);
            }
        });
    });
}

function createRecipeCard(recipe) {
    const isFavorite = favoriteRecipes.includes(recipe.id);
    return `
        <div class="recipe-card" data-recipe-id="${recipe.id}">
            <div class="recipe-image">
                <img src="${recipe.image}" alt="${recipe.title}">
                <div class="recipe-overlay">
                    <span class="view-recipe">View Recipe</span>
                </div>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(event, ${recipe.id})">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            <div class="recipe-content">
                <h4>${recipe.title}</h4>
                <div class="recipe-stats">
                    <span><i class="fas fa-check"></i> ${recipe.usedIngredientCount} used</span>
                    <span><i class="fas fa-plus"></i> ${recipe.missedIngredientCount} needed</span>
                </div>
            </div>
        </div>
    `;
}

async function showRecipeDetails(recipeId) {
    const modal = document.createElement('div');
    modal.className = 'recipe-modal';
    modal.innerHTML = `
        <div class="modal-content loading">
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading recipe details...</p>
            </div>
        </div>`;
    document.body.appendChild(modal);

    try {
        const recipe = await getRecipeDetails(recipeId);
        modal.querySelector('.modal-content').innerHTML = createRecipeDetailContent(recipe);
        initializeModalListeners(modal);
    } catch (error) {
        handleError();
    }
}

function createRecipeDetailContent(recipe) {
    const isFavorite = favoriteRecipes.includes(recipe.id);
    return `
        <div class="recipe-detail-image">
            <img src="${recipe.image}" alt="${recipe.title}">
        </div>
        <div class="recipe-detail-content">
            <button class="close-modal"><i class="fas fa-times"></i></button>
            <div class="recipe-detail-header">
                <h2>${recipe.title}</h2>
                <div class="recipe-actions">
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(event, ${recipe.id})">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button onclick="printRecipe()"><i class="fas fa-print"></i></button>
                    <button onclick="shareRecipe('${recipe.title}')"><i class="fas fa-share-alt"></i></button>
                </div>
            </div>
            
            <div class="recipe-meta-info">
                <div class="meta-item">
                    <i class="fas fa-clock"></i>
                    <span>${recipe.readyInMinutes} minutes</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-user"></i>
                    <span>${recipe.servings} servings</span>
                </div>
                ${recipe.vegetarian ? `
                    <div class="meta-item">
                        <i class="fas fa-leaf"></i>
                        <span>Vegetarian</span>
                    </div>
                ` : ''}
                ${recipe.glutenFree ? `
                    <div class="meta-item">
                        <i class="fas fa-wheat-alt"></i>
                        <span>Gluten Free</span>
                    </div>
                ` : ''}
            </div>

            <div class="ingredients-section">
                <h3>Ingredients</h3>
                <ul>
                    ${recipe.extendedIngredients.map(ing => `
                        <li>
                            <span class="ingredient-amount">${ing.amount} ${ing.unit}</span>
                            ${ing.original}
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div class="instructions-section">
                <h3>Instructions</h3>
                ${recipe.instructions ? `
                    <div class="steps">
                        ${recipe.analyzedInstructions[0]?.steps.map(step => `
                            <div class="step">
                                <span class="step-number">${step.number}</span>
                                <p>${step.step}</p>
                            </div>
                        `).join('') || recipe.instructions}
                    </div>
                ` : '<p>No instructions available.</p>'}
            </div>
        </div>`;
}

function toggleFavorite(event, recipeId) {
    event.stopPropagation();
    const index = favoriteRecipes.indexOf(recipeId);
    if (index === -1) {
        favoriteRecipes.push(recipeId);
        showToast('Added to favorites!');
    } else {
        favoriteRecipes.splice(index, 1);
        showToast('Removed from favorites!');
    }
    saveToLocalStorage();
    document.querySelectorAll(`.favorite-btn[onclick*="${recipeId}"]`)
        .forEach(btn => btn.classList.toggle('active'));
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }, 100);
}

function initializeModalListeners(modal) {
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => document.body.removeChild(modal));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    });
}

function handleError() {
    recipeList.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>Failed to fetch recipes. Please try again later.</p>
        </div>`;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadFromLocalStorage);

document.getElementById('language-select').addEventListener('change', function() {
    const selectedLang = this.value;
    updatePageLanguage(selectedLang);
});

function updatePageLanguage(lang) {
    // Update text content
    document.querySelector('h1').textContent = translations[lang].title;
    document.querySelector('header p').textContent = translations[lang].subtitle;
    
    // Update placeholders
    document.getElementById('search-input').placeholder = translations[lang].searchPlaceholder;
    
    // Update categories and ingredients
    document.querySelectorAll('.category h3').forEach(header => {
        const categoryKey = header.getAttribute('data-category');
        header.textContent = translations[lang].categories[categoryKey];
    });
    
    // Update ingredients
    document.querySelectorAll('.category li').forEach(item => {
        const ingredientKey = item.getAttribute('data-ingredient');
        item.textContent = translations[lang].ingredients[ingredientKey];
    });
}

// Add these functions after your existing code

function printRecipe() {
    window.print();
}

async function shareRecipe(title) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: title,
                text: `Check out this recipe: ${title}`,
                url: window.location.href
            });
            showToast('Recipe shared successfully!');
        } catch (error) {
            if (error.name !== 'AbortError') {
                showToast('Failed to share recipe');
            }
        }
    } else {
        // Fallback for browsers that don't support Web Share API
        const tempInput = document.createElement('input');
        tempInput.value = window.location.href;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showToast('Recipe link copied to clipboard!');
    }
}

// Add support for keyboard navigation in modal
function handleModalKeyboard(event, modal) {
    if (event.key === 'Escape') {
        document.body.removeChild(modal);
    }
}

// Update initializeModalListeners function
function initializeModalListeners(modal) {
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => document.body.removeChild(modal));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    });
    document.addEventListener('keydown', (e) => handleModalKeyboard(e, modal));
}
document.querySelector('.menu-toggle').addEventListener('click', function() {
    document.querySelector('.nav-links').classList.toggle('active');
});