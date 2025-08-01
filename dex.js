
// dex.js - Clean DEX functionality with auto-calculation
// This file handles all DEX operations including LP management, swaps, and charts

// ====== CONTRACT CONFIGURATION ======
const dexAbi = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenAmount",
				"type": "uint256"
			}
		],
		"name": "addLiquidity",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "provider",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokenAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "ethAmount",
				"type": "uint256"
			}
		],
		"name": "LiquidityAdded",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "swapEthToToken",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "ethIn",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokenIn",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "ethOut",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokenOut",
				"type": "uint256"
			}
		],
		"name": "Swapped",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenAmount",
				"type": "uint256"
			}
		],
		"name": "swapTokenToEth",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "getReserves",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "tokenReserve",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "ethReserve",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "pools",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "tokenReserve",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "ethReserve",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "symbol",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "initialSupply",
				"type": "uint256"
			}
		],
		"name": "createToken",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "creator",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "tokenAddress",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "symbol",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "initialSupply",
				"type": "uint256"
			}
		],
		"name": "TokenCreated",
		"type": "event"
	}
];

const dexAddress = "0x09b98f0a16f0BA62DcFf31A4650Ac8873a492CCF";

// ====== WETH CONTRACT CONFIGURATION ======
const wethAbi = [
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"src","type":"address"},{"indexed":true,"internalType":"address","name":"guy","type":"address"},{"indexed":false,"internalType":"uint256","name":"wad","type":"uint256"}],"name":"Approval","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"dst","type":"address"},{"indexed":false,"internalType":"uint256","name":"wad","type":"uint256"}],"name":"Deposit","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"src","type":"address"},{"indexed":true,"internalType":"address","name":"dst","type":"address"},{"indexed":false,"internalType":"uint256","name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"src","type":"address"},{"indexed":false,"internalType":"uint256","name":"wad","type":"uint256"}],"name":"Withdrawal","type":"event"},
    {"payable":true,"stateMutability":"payable","type":"fallback"},
    {"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
    {"constant":false,"inputs":[{"internalType":"address","name":"guy","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},
    {"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
    {"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},
    {"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},
    {"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},
    {"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},
    {"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
    {"constant":false,"inputs":[{"internalType":"address","name":"dst","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},
    {"constant":false,"inputs":[{"internalType":"address","name":"src","type":"address"},{"internalType":"address","name":"dst","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},
    {"constant":false,"inputs":[{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}
];

const wethAddress = "0x6f898cd313dcEe4D28A87F675BD93C471868B0Ac";

// ====== MINT USDC CONTRACT CONFIGURATION ======
const mintUSDCAbi = [
    {"inputs":[{"internalType":"address","name":"_gjToken","type":"address"},{"internalType":"address","name":"_usdcToken","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"USDCDeposited","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"usdcAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"gjBurned","type":"uint256"}],"name":"USDCMinted","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"USDCWithdrawn","type":"event"},
    {"inputs":[],"name":"BURN_ADDRESS","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"GJ_BURN_AMOUNT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"USDC_MINT_AMOUNT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"depositUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"getAvailableMints","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"getUSDCBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"gjToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"mintUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"usdcToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdrawUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

const mintUSDCAddress = "0xb5F217ec7CFe59A6405e6457e27489177AF6fdE1";

// ====== GLOBAL VARIABLES ======
let provider, signer, dexContract, wethContract, mintUSDCContract;
let isInitialized = false;

// ====== INITIALIZATION ======
async function initializeDEX() {
  if (isInitialized) return;
  
  try {
    if (window.ethereum && window.ethers) {
      provider = new window.ethers.providers.Web3Provider(window.ethereum);
      
      // Use global signer if available, otherwise create new one
      if (window.signer) {
        signer = window.signer;
        console.log("✅ Using global signer from app.js");
      } else {
        signer = provider.getSigner();
        console.log("✅ Created new signer");
      }
      
      if (dexAbi.length && dexAddress) {
        dexContract = new window.ethers.Contract(dexAddress, dexAbi, signer);
        window.dexContract = dexContract; // Export globally for create token functionality
        console.log("✅ DEX contract initialized:", dexAddress);
      }

      if (wethAbi.length && wethAddress) {
        wethContract = new window.ethers.Contract(wethAddress, wethAbi, signer);
        window.wethContract = wethContract; // Export globally
        console.log("✅ WETH contract initialized:", wethAddress);
      }

      // Initialize MintUSDC contract
      if (mintUSDCAbi.length && mintUSDCAddress) {
        mintUSDCContract = new window.ethers.Contract(mintUSDCAddress, mintUSDCAbi, signer);
        window.mintUSDCContract = mintUSDCContract; // Export globally
        console.log("✅ MintUSDC contract initialized:", mintUSDCAddress);
      }
      
      isInitialized = true;
      console.log("🎉 DEX initialization complete!");
      
      // Setup forms after initialization
      setupSwapForm();
      setupMintUSDCForm();
      setupDepositUSDCForm();
    }
  } catch (error) {
    console.error("❌ DEX initialization failed:", error);
  }
}

// ====== UTILITY FUNCTIONS ======
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function balanceOf(address owner) public view returns (uint256)",
  "function symbol() public view returns (string)",
  "function name() public view returns (string)",
  "function decimals() public view returns (uint8)"
];

async function getTokenInfo(tokenAddress) {
  if (!window.ethers.utils.isAddress(tokenAddress)) return null;
  
  try {
    const tokenContract = new window.ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);
    
    return { name, symbol, decimals };
  } catch (error) {
    console.error("❌ Token info fetch failed:", error);
    return null;
  }
}

// ====== VERIFIED TOKEN LIST FUNCTIONALITY ======
async function loadVerifiedTokens() {
  const tokenListContainer = document.getElementById('verifiedTokenList');
  const liveIndicator = document.getElementById('tokenListLiveIndicator');
  
  if (!tokenListContainer) {
    console.error("❌ Token list container not found");
    return;
  }
  
  try {
    console.log("🔍 Loading verified tokens...");
    
    if (!dexContract) {
      console.log("⚠️ DEX contract not initialized, showing placeholder");
      tokenListContainer.innerHTML = `
        <div class="token-loading">DEX contract not available. Please connect wallet.</div>
      `;
      return;
    }
    
    // Show live indicator
    if (liveIndicator) {
      liveIndicator.style.display = 'inline';
    }
    
    // Get TokenCreated events from the DEX contract
    console.log("📡 Fetching TokenCreated events...");
    const filter = dexContract.filters.TokenCreated();
    const events = await dexContract.queryFilter(filter, 0, "latest");
    
    console.log(`✅ Found ${events.length} token creation events`);
    
    let tokenHTML = '';
    
    // Always include GJ token at the top
    const gjToken = {
      address: '0x6B7ca0E7dDED09492ecC281d4Bf8C4c872C89c8E',
      name: 'GJ Token',
      symbol: 'GJ'
    };
    
    tokenHTML += `
      <div class="token-item gj-token">
        <div class="token-header">
          <div class="token-basic-info">
            <div class="token-logo-placeholder">GJ</div>
            <div class="token-name-symbol">
              <span class="token-name">
                ${gjToken.name}
                <button class="star-btn active" onclick="toggleFavorite('${gjToken.address}')" title="Add to favorites">⭐</button>
              </span>
              <span class="token-symbol">${gjToken.symbol}</span>
            </div>
          </div>
        </div>
        <div class="token-details">
          <div class="token-price-info">
            <div class="token-price" id="price-${gjToken.address}">Price: --</div>
          </div>
          <div class="token-address-section">
            <div class="token-address" title="${gjToken.address}">
              Contract: ${gjToken.address}
            </div>
            <button class="copy-btn" onclick="copyToClipboard('${gjToken.address}')" title="Copy contract address">📋</button>
          </div>
        </div>
      </div>
    `;
    
    // Process ALL created tokens (không filter theo creator)
    const processedTokens = [];
    for (const event of events) {
      try {
        const { creator, tokenAddress, name, symbol, initialSupply } = event.args;
        
        // Get additional token info
        const tokenInfo = await getTokenInfo(tokenAddress);
        if (tokenInfo) {
          processedTokens.push({
            address: tokenAddress,
            name: name || tokenInfo.name,
            symbol: symbol || tokenInfo.symbol,
            creator: creator,
            initialSupply: initialSupply,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          });
        }
      } catch (error) {
        console.error("❌ Error processing token event:", error);
      }
    }
    
    // Sort by block number (newest first)
    processedTokens.sort((a, b) => b.blockNumber - a.blockNumber);
    
    // Add created tokens to HTML
    for (const token of processedTokens) {
      tokenHTML += `
        <div class="token-item">
          <div class="token-header">
            <div class="token-basic-info">
              <div class="token-logo-placeholder">${token.symbol.charAt(0)}</div>
              <div class="token-name-symbol">
                <span class="token-name">${token.name}</span>
                <span class="token-symbol">${token.symbol}</span>
              </div>
            </div>
          </div>
          <div class="token-details">
            <div class="token-price-info">
              <div class="token-price" id="price-${token.address}">Price: --</div>
            </div>
            <div class="token-address-section">
              <div class="token-address" title="${token.address}">
                Contract: ${token.address}
              </div>
              <button class="copy-btn" onclick="copyToClipboard('${token.address}')" title="Copy contract address">📋</button>
            </div>
            <div class="token-creator" title="${token.creator}">
              Created by: ${token.creator.slice(0, 10)}...${token.creator.slice(-8)}
            </div>
          </div>
        </div>
      `;
    }
    
    // If no tokens found, show empty state
    if (processedTokens.length === 0) {
      // Không hiển thị thông báo gì
    }
    
    tokenListContainer.innerHTML = tokenHTML;
    console.log("✅ Token list updated successfully");
    
    // Load real-time prices for all tokens (GJ + filtered tokens)
    const allTokenAddresses = [gjToken.address];
    if (processedTokens.length > 0) {
      allTokenAddresses.push(...processedTokens.map(t => t.address));
    }
    await loadTokenPrices(allTokenAddresses);
    
  } catch (error) {
    console.error("❌ Error loading verified tokens:", error);
    tokenListContainer.innerHTML = `
      <div class="token-error">
        <p>Error loading tokens: ${error.message}</p>
        <button onclick="window.loadVerifiedTokens()" class="retry-btn">Retry</button>
      </div>
    `;
  }
}

// ====== TOKEN UTILITIES ======
async function loadTokenPrices(tokenAddresses) {
  console.log("💰 Loading token prices...");
  
  for (const tokenAddress of tokenAddresses) {
    try {
      const price = await getTokenPrice(tokenAddress);
      const priceElement = document.getElementById(`price-${tokenAddress}`);
      if (priceElement) {
        if (price && price !== "0") {
          priceElement.textContent = `Price: ${parseFloat(price).toFixed(6)} ETH`;
          priceElement.style.color = "#4ade80"; // Green for available price
        } else {
          priceElement.textContent = "Price: No liquidity";
          priceElement.style.color = "#f87171"; // Red for no liquidity
        }
      }
    } catch (error) {
      console.error(`❌ Error loading price for ${tokenAddress}:`, error);
      const priceElement = document.getElementById(`price-${tokenAddress}`);
      if (priceElement) {
        priceElement.textContent = "Price: Error";
        priceElement.style.color = "#f87171";
      }
    }
  }
}

async function getTokenPrice(tokenAddress) {
  if (!dexContract || !window.ethers.utils.isAddress(tokenAddress)) return "0";
  
  try {
    const [tokenReserve, ethReserve] = await dexContract.getReserves(tokenAddress);
    
    if (tokenReserve.eq(0) || ethReserve.eq(0)) {
      return "0"; // No liquidity
    }
    
    // Price = ETH reserve / Token reserve
    const priceWei = ethReserve.mul(window.ethers.utils.parseEther("1")).div(tokenReserve);
    return window.ethers.utils.formatEther(priceWei);
  } catch (error) {
    console.error("❌ Price calculation failed:", error);
    return "0";
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    console.log("📋 Address copied to clipboard:", text);
    showToast("Contract address copied!", "success");
  }).catch(err => {
    console.error("❌ Failed to copy:", err);
    showToast("Failed to copy address", "error");
  });
}

function toggleFavorite(tokenAddress) {
  const starBtn = event.target;
  const isActive = starBtn.classList.contains('active');
  
  if (isActive) {
    starBtn.classList.remove('active');
    removeFavorite(tokenAddress);
    showToast("Removed from favorites", "info");
  } else {
    starBtn.classList.add('active');
    addFavorite(tokenAddress);
    showToast("Added to favorites", "success");
  }
}

function addFavorite(tokenAddress) {
  let favorites = JSON.parse(localStorage.getItem('favoriteTokens') || '[]');
  if (!favorites.includes(tokenAddress)) {
    favorites.push(tokenAddress);
    localStorage.setItem('favoriteTokens', JSON.stringify(favorites));
  }
}

function removeFavorite(tokenAddress) {
  let favorites = JSON.parse(localStorage.getItem('favoriteTokens') || '[]');
  favorites = favorites.filter(addr => addr !== tokenAddress);
  localStorage.setItem('favoriteTokens', JSON.stringify(favorites));
}

function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // Style the toast
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10000;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

async function checkPoolExists(tokenAddress) {
  if (!dexContract || !window.ethers.utils.isAddress(tokenAddress)) return false;
  
  try {
    const [tokenReserve, ethReserve] = await dexContract.getReserves(tokenAddress);
    return tokenReserve.gt(0) && ethReserve.gt(0);
  } catch (error) {
    console.error("❌ Pool check failed:", error);
    return false;
  }
}

async function calculateRequiredETH(tokenAddress, tokenAmount) {
  if (!dexContract || !tokenAmount || tokenAmount === "0") return "0";
  
  try {
    const [tokenReserve, ethReserve] = await dexContract.getReserves(tokenAddress);
    
    if (tokenReserve.eq(0) || ethReserve.eq(0)) {
      return "0"; // No existing pool
    }
    
    const tokenAmountWei = window.ethers.utils.parseUnits(tokenAmount, 18);
    const requiredETHWei = tokenAmountWei.mul(ethReserve).div(tokenReserve);
    
    return window.ethers.utils.formatEther(requiredETHWei);
  } catch (error) {
    console.error("❌ ETH calculation failed:", error);
    return "0";
  }
}

// ====== DEBOUNCED INPUT HANDLING ======
let debounceTimer;
function debounce(func, delay) {
  return function(...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
}

// ====== LP AUTO-CALCULATION SETUP ======
function setupLPAutoCalculation() {
  const tokenAddressInput = document.getElementById("lpTokenAddress");
  const tokenAmountInput = document.getElementById("lpTokenAmount");
  const ethAmountInput = document.getElementById("lpEthAmount");
  const tokenInfoDiv = document.getElementById("lpTokenInfo");
  const lockIcon = document.querySelector(".lock-icon");
  
  if (!tokenAddressInput || !tokenAmountInput || !ethAmountInput) {
    console.warn("⚠️ LP form elements not found");
    return;
  }
  
  console.log("🔧 Setting up LP auto-calculation...");
  
  // Token address change handler
  const handleTokenAddressChange = debounce(async (tokenAddress) => {
    console.log("🔍 Token address changed:", tokenAddress);
    
    // Clear previous state
    if (tokenInfoDiv) tokenInfoDiv.innerHTML = "";
    ethAmountInput.readOnly = false;
    ethAmountInput.value = "";
    if (lockIcon) lockIcon.style.display = "none";
    
    if (!window.ethers.utils.isAddress(tokenAddress)) {
      console.log("❌ Invalid token address");
      return;
    }
    
    try {
      // Fetch token info
      const tokenInfo = await getTokenInfo(tokenAddress);
      if (tokenInfo && tokenInfoDiv) {
        tokenInfoDiv.innerHTML = `<span class="token-name">${tokenInfo.name} (${tokenInfo.symbol})</span>`;
        console.log("✅ Token info loaded:", tokenInfo);
      }
      
      // Check if pool exists
      const poolExists = await checkPoolExists(tokenAddress);
      console.log("🏊 Pool exists:", poolExists);
      
      if (poolExists) {
        ethAmountInput.readOnly = true;
        if (lockIcon) lockIcon.style.display = "block";
        console.log("🔒 ETH field locked - pool exists");
        
        // Calculate ETH if token amount is already entered
        if (tokenAmountInput.value && tokenAmountInput.value !== "0") {
          const requiredETH = await calculateRequiredETH(tokenAddress, tokenAmountInput.value);
          ethAmountInput.value = requiredETH;
          console.log("💰 Auto-calculated ETH:", requiredETH);
        }
      }
      
    } catch (error) {
      console.error("❌ Token address change error:", error);
    }
  }, 500);
  
  // Token amount change handler
  const handleTokenAmountChange = debounce(async (tokenAmount) => {
    const tokenAddress = tokenAddressInput.value.trim();
    
    console.log("🔢 Token amount changed:", tokenAmount, "for token:", tokenAddress);
    
    if (!window.ethers.utils.isAddress(tokenAddress) || !tokenAmount || tokenAmount === "0") {
      if (ethAmountInput.readOnly) {
        ethAmountInput.value = "";
      }
      return;
    }
    
    try {
      const poolExists = await checkPoolExists(tokenAddress);
      console.log("🏊 Pool exists for amount calc:", poolExists);
      
      if (poolExists && ethAmountInput.readOnly) {
        const requiredETH = await calculateRequiredETH(tokenAddress, tokenAmount);
        ethAmountInput.value = requiredETH;
        console.log("💰 Auto-calculated ETH:", requiredETH);
      }
      
    } catch (error) {
      console.error("❌ Token amount change error:", error);
    }
  }, 300);
  
  // Add event listeners
  tokenAddressInput.addEventListener("input", (e) => {
    handleTokenAddressChange(e.target.value.trim());
  });
  
  tokenAmountInput.addEventListener("input", (e) => {
    handleTokenAmountChange(e.target.value.trim());
  });
  
  console.log("✅ LP auto-calculation setup complete");
}

// ====== SWAP TOKEN INFO SETUP ======
function setupSwapTokenInfo() {
  const tokenAddressInput = document.getElementById("swapTokenAddress");
  const tokenInfoDiv = document.getElementById("swapTokenInfo");
  const swapPreview = document.getElementById("swapPreview");
  
  if (!tokenAddressInput) return;
  
  // Function to update direction options
  const updateDirectionOptions = (tokenName) => {
    const directionSelect = document.getElementById("swapDirection");
    if (directionSelect) {
      const currentValue = directionSelect.value;
      directionSelect.innerHTML = `
        <option value="ethToToken">ETH → ${tokenName}</option>
        <option value="tokenToEth">${tokenName} → ETH</option>
      `;
      directionSelect.value = currentValue; // Preserve selected value
    }
  };
  
  // Initialize with default token name
  updateDirectionOptions("Token");
  
  const handleSwapTokenChange = debounce(async (tokenAddress) => {
    if (tokenInfoDiv) tokenInfoDiv.innerHTML = "";
    if (swapPreview) swapPreview.innerHTML = "";
    
    if (!window.ethers.utils.isAddress(tokenAddress)) {
      // Reset direction options to default
      updateDirectionOptions("Token");
      return;
    }
    
    try {
      const tokenInfo = await getTokenInfo(tokenAddress);
      if (tokenInfo && tokenInfoDiv) {
        tokenInfoDiv.innerHTML = `<span class="token-name">${tokenInfo.name} (${tokenInfo.symbol})</span>`;
        
        // Update direction options with token name
        updateDirectionOptions(tokenInfo.name);
        
        // Update swap preview and trigger calculation
        updateSwapPreview();
      }
    } catch (error) {
      console.error("❌ Swap token info error:", error);
      updateDirectionOptions("Token");
    }
  }, 500);
  
  tokenAddressInput.addEventListener("input", (e) => {
    handleSwapTokenChange(e.target.value.trim());
  });
}

// ====== SWAP AUTO-CALCULATION ======
async function calculateSwapAmount(tokenAddress, direction, inputAmount) {
  if (!dexContract || !tokenAddress || !inputAmount || inputAmount <= 0) {
    return null;
  }
  
  try {
    const [tokenReserve, ethReserve] = await dexContract.getReserves(tokenAddress);
    
    if (tokenReserve.eq(0) || ethReserve.eq(0)) {
      return { error: "No liquidity pool found" };
    }
    
    // Get token info for display
    const tokenInfo = await getTokenInfo(tokenAddress);
    const tokenSymbol = tokenInfo ? tokenInfo.symbol : "TOKEN";
    
    const amount = parseFloat(inputAmount);
    const ethReserveNum = Number(window.ethers.utils.formatEther(ethReserve));
    const tokenReserveNum = Number(window.ethers.utils.formatUnits(tokenReserve, 18));
    
    if (direction === "ethToToken") {
      // Calculate tokens received for ETH input
      // Using constant product formula with 0.3% fee
      const fee = 0.003; // 0.3% trading fee
      const ethAfterFee = amount * (1 - fee);
      const tokensOut = (tokenReserveNum * ethAfterFee) / (ethReserveNum + ethAfterFee);
      
      return {
        input: `${amount} ETH`,
        output: `≈ ${tokensOut.toFixed(6)} ${tokenSymbol}`,
        rate: `1 ETH = ${(tokenReserveNum / ethReserveNum).toFixed(6)} ${tokenSymbol}`,
        fee: `Fee: ${(amount * fee).toFixed(6)} ETH`,
        priceImpact: `${(((ethAfterFee / ethReserveNum) * 100)).toFixed(2)}%`
      };
    } else {
      // Calculate ETH received for token input
      const fee = 0.003; // 0.3% trading fee
      const tokensAfterFee = amount * (1 - fee);
      const ethOut = (ethReserveNum * tokensAfterFee) / (tokenReserveNum + tokensAfterFee);
      
      return {
        input: `${amount} ${tokenSymbol}`,
        output: `≈ ${ethOut.toFixed(6)} ETH`,
        rate: `1 ${tokenSymbol} = ${(ethReserveNum / tokenReserveNum).toFixed(6)} ETH`,
        fee: `Fee: ${(amount * fee).toFixed(6)} ${tokenSymbol}`,
        priceImpact: `${(((tokensAfterFee / tokenReserveNum) * 100)).toFixed(2)}%`
      };
    }
  } catch (error) {
    console.error("❌ Swap calculation error:", error);
    return { error: "Calculation failed" };
  }
}

function setupSwapAutoCalculation() {
  const amountInput = document.getElementById("swapAmount");
  const directionSelect = document.getElementById("swapDirection");
  const tokenAddressInput = document.getElementById("swapTokenAddress");
  const amountLabel = document.getElementById("swapAmountLabel");
  const amountHint = document.getElementById("swapAmountHint");
  
  if (!amountInput || !directionSelect || !tokenAddressInput) return;
  
  // Update label based on direction and token info
  const updateLabel = async () => {
    const direction = directionSelect.value;
    const tokenAddress = tokenAddressInput.value.trim();
    
    let tokenName = "Token";
    if (window.ethers.utils.isAddress(tokenAddress)) {
      try {
        const tokenInfo = await getTokenInfo(tokenAddress);
        if (tokenInfo && tokenInfo.name) {
          tokenName = tokenInfo.name;
        }
      } catch (error) {
        console.error("Error getting token info:", error);
      }
    }
    
    // Update direction options with token name
    if (directionSelect) {
      const currentValue = directionSelect.value;
      directionSelect.innerHTML = `
        <option value="ethToToken">ETH → ${tokenName}</option>
        <option value="tokenToEth">${tokenName} → ETH</option>
      `;
      directionSelect.value = currentValue; // Preserve selected value
    }
    
    if (amountLabel) {
      amountLabel.textContent = direction === "ethToToken" ? "ETH Amount:" : `${tokenName} Amount:`;
    }
    if (amountHint) {
      amountHint.textContent = direction === "ethToToken" ? `Enter ETH amount to buy ${tokenName}` : `Enter ${tokenName} amount to sell for ETH`;
    }
    // Clear amount when direction changes
    amountInput.value = "";
    updateSwapPreview();
  };
  
  // Initialize label
  updateLabel();
  
  const updateCalculation = debounce(async () => {
    const tokenAddress = tokenAddressInput.value.trim();
    const direction = directionSelect.value;
    const amount = amountInput.value.trim();
    
    if (window.ethers.utils.isAddress(tokenAddress) && amount && !isNaN(amount) && Number(amount) > 0) {
      const result = await calculateSwapAmount(tokenAddress, direction, amount);
      updateSwapPreview(result);
    } else {
      updateSwapPreview();
    }
  }, 300);
  
  amountInput.addEventListener("input", updateCalculation);
  directionSelect.addEventListener("change", () => {
    updateLabel();
    updateCalculation();
  });
  tokenAddressInput.addEventListener("input", () => {
    updateLabel(); // Update label when token changes
    updateCalculation();
  });
}

async function updateSwapPreview(calculation = null) {
  const swapPreview = document.getElementById("swapPreview");
  const tokenAddressInput = document.getElementById("swapTokenAddress");
  
  if (!swapPreview) return;
  
  if (!calculation) {
    const tokenAddress = tokenAddressInput?.value.trim();
    if (tokenAddress && window.ethers.utils.isAddress(tokenAddress)) {
      try {
        const tokenInfo = await getTokenInfo(tokenAddress);
        if (tokenInfo) {
          swapPreview.innerHTML = `
            <div class="swap-preview-item">
              <div style="font-weight: 600;">Ready to swap ETH ↔ ${tokenInfo.symbol}</div>
              <div style="font-size: 0.8rem; opacity: 0.7; margin-top: 0.25rem;">Enter amount to see calculation</div>
            </div>
          `;
          return;
        }
      } catch (error) {
        console.error("❌ Token info error:", error);
      }
    }
    
    swapPreview.innerHTML = `
      <div class="swap-preview-item">
        <div style="opacity: 0.7;">Enter token address and amount to see swap details</div>
      </div>
    `;
    return;
  }
  
  if (calculation.error) {
    swapPreview.innerHTML = `
      <div class="swap-preview-item" style="color: #dc3545;">
        <div style="font-weight: 600;">❌ ${calculation.error}</div>
      </div>
    `;
    return;
  }
  
  swapPreview.innerHTML = `
    <div class="swap-preview-item">
      <div style="font-weight: 600; margin-bottom: 0.5rem; color: #ffd700;">
        ${calculation.input} → ${calculation.output}
      </div>
      <div style="font-size: 0.8rem; opacity: 0.8; margin-bottom: 0.25rem;">
        Exchange Rate: ${calculation.rate}
      </div>
      <div style="font-size: 0.8rem; opacity: 0.8; margin-bottom: 0.25rem;">
        Trading Fee: ${calculation.fee}
      </div>
      <div style="font-size: 0.8rem; opacity: 0.8; color: ${parseFloat(calculation.priceImpact) > 5 ? '#dc3545' : '#28a745'};">
        Price Impact: ${calculation.priceImpact}
      </div>
    </div>
  `;
}

// ====== CHART TOKEN INFO SETUP ======
function setupChartTokenInfo() {
  const tokenAddressInput = document.getElementById("chartTokenAddress");
  const tokenInfoDiv = document.getElementById("chartTokenInfo");
  
  if (!tokenAddressInput) return;
  
  const handleChartTokenChange = debounce(async (tokenAddress) => {
    if (tokenInfoDiv) tokenInfoDiv.innerHTML = "";
    
    if (!window.ethers.utils.isAddress(tokenAddress)) return;
    
    try {
      const tokenInfo = await getTokenInfo(tokenAddress);
      if (tokenInfo && tokenInfoDiv) {
        tokenInfoDiv.innerHTML = `<span class="token-name">${tokenInfo.name} (${tokenInfo.symbol})</span>`;
      }
    } catch (error) {
      console.error("❌ Chart token info error:", error);
    }
  }, 500);
  
  tokenAddressInput.addEventListener("input", (e) => {
    handleChartTokenChange(e.target.value.trim());
  });
}

// ====== LP FORM HANDLER ======
function setupLPForm() {
  const addLpForm = document.getElementById("addLpForm");
  if (!addLpForm) return;
  
  addLpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const lpStatus = document.getElementById("lpStatus");
    if (lpStatus) lpStatus.textContent = "";
    
    if (!dexContract) {
      if (lpStatus) {
        lpStatus.textContent = "DEX contract not configured!";
        lpStatus.className = "status error";
      }
      return;
    }
    
    const tokenAddress = document.getElementById("lpTokenAddress").value.trim();
    const tokenAmount = document.getElementById("lpTokenAmount").value.trim();
    const ethAmount = document.getElementById("lpEthAmount").value.trim();
    
    // Validation
    if (!window.ethers.utils.isAddress(tokenAddress)) {
      if (lpStatus) {
        lpStatus.textContent = "Invalid token address!";
        lpStatus.className = "status error";
      }
      return;
    }
    
    if (isNaN(tokenAmount) || isNaN(ethAmount) || Number(tokenAmount) <= 0 || Number(ethAmount) <= 0) {
      if (lpStatus) {
        lpStatus.textContent = "Invalid token or ETH amount!";
        lpStatus.className = "status error";
      }
      return;
    }
    
    try {
      const decimals = 18;
      const tokenAmountWei = window.ethers.utils.parseUnits(tokenAmount, decimals);
      const ethAmountWei = window.ethers.utils.parseEther(ethAmount);
      const userAddress = await signer.getAddress();
      
      // Check token balance
      const erc20 = new window.ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const balance = await erc20.balanceOf(userAddress);
      
      if (balance.lt(tokenAmountWei)) {
        if (lpStatus) {
          lpStatus.textContent = "Insufficient token balance!";
          lpStatus.className = "status error";
        }
        return;
      }
      
      // Check allowance
      const allowance = await erc20.allowance(userAddress, dexAddress);
      if (allowance.lt(tokenAmountWei)) {
        if (lpStatus) lpStatus.textContent = "Approving token...";
        const approveTx = await erc20.approve(dexAddress, tokenAmountWei);
        await approveTx.wait();
      }
      
      // Check ETH balance
      const ethBalance = await provider.getBalance(userAddress);
      if (ethBalance.lt(ethAmountWei)) {
        if (lpStatus) {
          lpStatus.textContent = "Insufficient ETH balance!";
          lpStatus.className = "status error";
        }
        return;
      }
      
      if (lpStatus) lpStatus.textContent = "Adding liquidity...";
      
      const tx = await dexContract.addLiquidity(tokenAddress, tokenAmountWei, { value: ethAmountWei });
      await tx.wait();
      
      if (lpStatus) {
        lpStatus.textContent = "Add liquidity successful!";
        lpStatus.className = "status success";
      }
      
      // Refresh pools display
      await renderMyPools();
      
    } catch (err) {
      console.error("❌ Add liquidity error:", err);
      if (lpStatus) {
        lpStatus.textContent = `Add liquidity error: ${err.message}`;
        lpStatus.className = "status error";
      }
    }
  });
}

// ====== SWAP FORM HANDLER ======
function setupSwapForm() {
  console.log("🔧 Setting up swap form...");
  const swapForm = document.getElementById("swapForm");
  if (!swapForm) {
    console.log("❌ Swap form not found!");
    return;
  }
  
  // Check if already set up
  if (swapForm.dataset.setupComplete === "true") {
    console.log("✅ Swap form already set up, skipping...");
    return;
  }
  
  console.log("✅ Swap form found, adding event listener");
  
  swapForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("🚀 Swap form submitted!");
    
    // Prevent multiple submissions
    const submitButton = swapForm.querySelector('button[type="submit"]');
    if (submitButton && submitButton.disabled) {
      console.log("⏳ Swap already in progress, ignoring duplicate submission");
      return;
    }
    
    // Disable submit button during processing
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Processing...";
    }
    
    const swapStatus = document.getElementById("swapStatus");
    if (swapStatus) swapStatus.textContent = "";
    
    try {
      if (!dexContract) {
        console.log("❌ DEX contract not configured!");
        if (swapStatus) {
          swapStatus.textContent = "DEX contract not configured!";
          swapStatus.className = "status error";
        }
        return;
      }
    
    const tokenAddress = document.getElementById("swapTokenAddress").value.trim();
    const direction = document.getElementById("swapDirection").value;
    const amount = document.getElementById("swapAmount").value.trim();
    
    console.log("💡 Swap parameters:", { tokenAddress, direction, amount });
    
    // Validation
    if (!window.ethers.utils.isAddress(tokenAddress)) {
      console.log("❌ Invalid token address:", tokenAddress);
      if (swapStatus) {
        swapStatus.textContent = "Invalid token address!";
        swapStatus.className = "status error";
      }
      return;
    }
    
    if (isNaN(amount) || Number(amount) <= 0) {
      console.log("❌ Invalid amount:", amount);
      if (swapStatus) {
        swapStatus.textContent = "Invalid amount!";
        swapStatus.className = "status error";
      }
      return;
    }
    
    try {
      const decimals = 18;
      const userAddress = await signer.getAddress();
      
      if (direction === "ethToToken") {
        // Swap ETH to Token
        const ethAmountWei = window.ethers.utils.parseEther(amount);
        const ethBalance = await provider.getBalance(userAddress);
        
        if (ethBalance.lt(ethAmountWei)) {
          if (swapStatus) {
            swapStatus.textContent = "Insufficient ETH balance!";
            swapStatus.className = "status error";
          }
          return;
        }
        
        if (swapStatus) swapStatus.textContent = "Swapping ETH to Token...";
        
        const tx = await dexContract.swapEthToToken(tokenAddress, { value: ethAmountWei });
        await tx.wait();
        
        if (swapStatus) {
          swapStatus.textContent = "Swap ETH to Token successful!";
          swapStatus.className = "status success";
        }
        
        // Update balances after successful swap
        console.log("🔄 Starting balance update after ETH to Token swap...");
        if (typeof window.updateBalancesQuick === 'function') {
          await window.updateBalancesQuick();
          console.log("✅ updateBalancesQuick completed for ETH to Token");
        } else {
          console.log("❌ updateBalancesQuick function not found, waiting...");
          // Wait a bit and try again
          setTimeout(async () => {
            if (typeof window.updateBalancesQuick === 'function') {
              await window.updateBalancesQuick();
              console.log("✅ updateBalancesQuick completed after delay");
            } else {
              console.log("❌ updateBalancesQuick still not found");
            }
          }, 1000);
        }
        
        // Force update specific token balance if it's GJ token
        if (tokenAddress.toLowerCase() === "0x6B7ca0E7dDED09492ecC281d4Bf8C4c872C89c8E".toLowerCase()) {
          console.log("🔄 Forcing GJ balance update after ETH to Token swap");
          if (window.contract && window.signer) {
            try {
              const userAddress = await window.signer.getAddress();
              const gjBalance = await window.contract.balanceOf(userAddress);
              const decimals = await window.contract.decimals();
              const gjFormatted = parseFloat(window.ethers.utils.formatUnits(gjBalance, decimals)).toFixed(4);
              
              const gjBalanceSpan = document.getElementById("gjBalance");
              if (gjBalanceSpan) {
                gjBalanceSpan.textContent = `GJ: ${gjFormatted}`;
                gjBalanceSpan.style.animation = 'balanceFlash 0.6s ease-out';
                setTimeout(() => {
                  if (gjBalanceSpan) gjBalanceSpan.style.animation = '';
                }, 600);
                console.log("✅ GJ balance updated:", gjFormatted);
              }
            } catch (error) {
              console.error("Error updating GJ balance:", error);
            }
          }
        }
        
        // Reset form
        swapForm.reset();
        // Set default GJ token address back
        document.getElementById("swapTokenAddress").value = "0x6B7ca0E7dDED09492ecC281d4Bf8C4c872C89c8E";
        
      } else {
        // Swap Token to ETH
        const tokenAmountWei = window.ethers.utils.parseUnits(amount, decimals);
        const erc20 = new window.ethers.Contract(tokenAddress, ERC20_ABI, signer);
        
        const balance = await erc20.balanceOf(userAddress);
        if (balance.lt(tokenAmountWei)) {
          if (swapStatus) {
            swapStatus.textContent = "Insufficient token balance!";
            swapStatus.className = "status error";
          }
          return;
        }
        
        // Check allowance and approve only if needed
        const allowance = await erc20.allowance(userAddress, dexAddress);
        if (allowance.lt(tokenAmountWei)) {
          if (swapStatus) swapStatus.textContent = "Approving token (one-time setup)...";
          // Approve max amount to avoid future approvals
          const maxApproval = window.ethers.constants.MaxUint256;
          const approveTx = await erc20.approve(dexAddress, maxApproval);
          await approveTx.wait();
          if (swapStatus) swapStatus.textContent = "Approval completed, proceeding with swap...";
        }
        
        if (swapStatus) swapStatus.textContent = "Swapping Token to ETH...";
        
        const tx = await dexContract.swapTokenToEth(tokenAddress, tokenAmountWei);
        await tx.wait();
        
        if (swapStatus) {
          swapStatus.textContent = "Swap Token to ETH successful!";
          swapStatus.className = "status success";
        }
        
        // Update balances after successful swap
        console.log("🔄 Starting balance update after Token to ETH swap...");
        if (typeof window.updateBalancesQuick === 'function') {
          await window.updateBalancesQuick();
          console.log("✅ updateBalancesQuick completed for Token to ETH");
        } else {
          console.log("❌ updateBalancesQuick function not found, waiting...");
          // Wait a bit and try again
          setTimeout(async () => {
            if (typeof window.updateBalancesQuick === 'function') {
              await window.updateBalancesQuick();
              console.log("✅ updateBalancesQuick completed after delay");
            } else {
              console.log("❌ updateBalancesQuick still not found");
            }
          }, 1000);
        }
        
        // Force update specific token balance if it's GJ token
        if (tokenAddress.toLowerCase() === "0x6B7ca0E7dDED09492ecC281d4Bf8C4c872C89c8E".toLowerCase()) {
          console.log("🔄 Forcing GJ balance update after Token to ETH swap");
          if (window.contract && window.signer) {
            try {
              const userAddress = await window.signer.getAddress();
              const gjBalance = await window.contract.balanceOf(userAddress);
              const decimals = await window.contract.decimals();
              const gjFormatted = parseFloat(window.ethers.utils.formatUnits(gjBalance, decimals)).toFixed(4);
              
              const gjBalanceSpan = document.getElementById("gjBalance");
              if (gjBalanceSpan) {
                gjBalanceSpan.textContent = `GJ: ${gjFormatted}`;
                gjBalanceSpan.style.animation = 'balanceFlash 0.6s ease-out';
                setTimeout(() => {
                  if (gjBalanceSpan) gjBalanceSpan.style.animation = '';
                }, 600);
                console.log("✅ GJ balance updated:", gjFormatted);
              }
            } catch (error) {
              console.error("Error updating GJ balance:", error);
            }
          }
        }
        
        // Reset form
        swapForm.reset();
        // Set default GJ token address back
        document.getElementById("swapTokenAddress").value = "0x6B7ca0E7dDED09492ecC281d4Bf8C4c872C89c8E";
      }
      
    } catch (err) {
      console.error("❌ Swap error:", err);
      if (swapStatus) {
        swapStatus.textContent = `Swap error: ${err.message}`;
        swapStatus.className = "status error";
      }
    } finally {
      // Re-enable submit button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Swap";
      }
    }
    
    } catch (error) {
      console.error("❌ Outer swap form error:", error);
      if (swapStatus) {
        swapStatus.textContent = `Error: ${error.message}`;
        swapStatus.className = "status error";
      }
    } finally {
      // Always re-enable submit button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Swap";
      }
    }
  });
  
  // Mark form as set up
  swapForm.dataset.setupComplete = "true";
  console.log("✅ Swap form setup completed");
}

// ====== CHART FUNCTIONALITY ======
let currentChart = null;

function setupChartForm() {
  const chartForm = document.getElementById("chartForm");
  if (!chartForm) return;
  
  chartForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const chartStatus = document.getElementById("chartStatus");
    const chartContainer = document.querySelector(".chart-container");
    if (chartStatus) chartStatus.textContent = "";
    
    const tokenAddress = document.getElementById("chartTokenAddress").value.trim();
    
    if (!window.ethers.utils.isAddress(tokenAddress)) {
      if (chartStatus) {
        chartStatus.textContent = "Invalid token address!";
        chartStatus.className = "status error";
      }
      return;
    }
    
    try {
      if (chartStatus) chartStatus.textContent = "Loading chart data...";
      
      // Clear existing chart
      if (currentChart) {
        currentChart.remove();
        currentChart = null;
      }
      
      // Clear container
      if (chartContainer) {
        chartContainer.innerHTML = '<div id="tvChart" style="width: 100%; height: 300px;"></div>';
      }
      
      const [tokenReserve, ethReserve] = await dexContract.getReserves(tokenAddress);
      
      // Calculate current price
      const currentPrice = ethReserve.gt(0) && tokenReserve.gt(0)
        ? Number(window.ethers.utils.formatEther(ethReserve)) / Number(window.ethers.utils.formatUnits(tokenReserve, 18))
        : 0;
      
      if (currentPrice === 0) {
        if (chartContainer) {
          chartContainer.innerHTML = `
            <div class="chart-error">
              <div>
                <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">📊 No Liquidity Pool</div>
                <div>This token doesn't have a liquidity pool yet.</div>
                <div style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7;">Add liquidity to see price charts</div>
              </div>
            </div>
          `;
        }
        if (chartStatus) chartStatus.textContent = "";
        return;
      }
      
      // Get token info
      const tokenInfo = await getTokenInfo(tokenAddress);
      const tokenSymbol = tokenInfo ? tokenInfo.symbol : "TOKEN";
      
      // Check if TradingView is available
      if (typeof LightweightCharts !== 'undefined') {
        try {
          // Create TradingView chart
          const chartElement = document.getElementById('tvChart');
          if (chartElement) {
            console.log('📊 Creating TradingView chart...');
            console.log('📊 LightweightCharts available:', typeof LightweightCharts);
            
            // Check if createChart method exists
            if (typeof LightweightCharts.createChart !== 'function') {
              throw new Error('LightweightCharts.createChart is not a function');
            }
            
            currentChart = LightweightCharts.createChart(chartElement, {
              width: chartElement.offsetWidth,
              height: 300,
              layout: {
                background: { color: '#0a0a0a' },
                textColor: '#ffd700',
              },
              grid: {
                vertLines: { color: 'rgba(255, 215, 0, 0.1)' },
                horzLines: { color: 'rgba(255, 215, 0, 0.1)' },
              },
              crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
              },
              rightPriceScale: {
                borderColor: 'rgba(255, 215, 0, 0.3)',
              },
              timeScale: {
                borderColor: 'rgba(255, 215, 0, 0.3)',
                timeVisible: true,
                secondsVisible: false,
              },
            });
            
            console.log('📊 Chart created:', currentChart);
            console.log('📊 Chart methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(currentChart)));
            
            // Try different method names for candlestick series
            let candlestickSeries;
            if (typeof currentChart.addCandlestickSeries === 'function') {
              console.log('📊 Using addCandlestickSeries method...');
              candlestickSeries = currentChart.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
              });
            } else if (typeof currentChart.addOhlcSeries === 'function') {
              console.log('📊 Using addOhlcSeries method...');
              candlestickSeries = currentChart.addOhlcSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
              });
            } else {
              // Try to find any method that contains 'candlestick' or 'ohlc'
              const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(currentChart));
              const seriesMethod = methods.find(method => 
                method.toLowerCase().includes('candlestick') || 
                method.toLowerCase().includes('ohlc') ||
                method.toLowerCase().includes('series')
              );
              
              if (seriesMethod) {
                console.log(`📊 Using ${seriesMethod} method...`);
                candlestickSeries = currentChart[seriesMethod]({
                  upColor: '#26a69a',
                  downColor: '#ef5350',
                  borderVisible: false,
                  wickUpColor: '#26a69a',
                  wickDownColor: '#ef5350',
                });
              } else {
                throw new Error('No candlestick series method found. Available methods: ' + methods.join(', '));
              }
            }
            
            if (!candlestickSeries) {
              throw new Error('Failed to create candlestick series');
            }
            
            console.log('📊 Candlestick series created:', candlestickSeries);
          
          // Generate sample candlestick data (simulate price history)
          const now = Math.floor(Date.now() / 1000);
          const candleData = [];
          
          // Generate 30 days of sample data
          for (let i = 30; i >= 0; i--) {
            const time = now - (i * 24 * 60 * 60); // Each day
            const basePrice = currentPrice;
            const volatility = basePrice * 0.1; // 10% volatility
            
            const open = basePrice + (Math.random() - 0.5) * volatility;
            const close = basePrice + (Math.random() - 0.5) * volatility;
            const high = Math.max(open, close) + Math.random() * volatility * 0.5;
            const low = Math.min(open, close) - Math.random() * volatility * 0.5;
            
            candleData.push({
              time: time,
              open: Math.max(0, open),
              high: Math.max(0, high),
              low: Math.max(0, low),
              close: Math.max(0, close),
            });
          }
          
          candlestickSeries.setData(candleData);
          
          // Add current price line
          const priceLine = candlestickSeries.createPriceLine({
            price: currentPrice,
            color: '#ffd700',
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Current: ${currentPrice.toFixed(8)} ETH`,
          });
          
          // Fit content
          currentChart.timeScale().fitContent();
          
          // Handle resize
          const resizeObserver = new ResizeObserver(entries => {
            if (currentChart && entries.length > 0) {
              const { width, height } = entries[0].contentRect;
              currentChart.applyOptions({ width, height: 300 });
            }
          });
          
          resizeObserver.observe(chartElement);
        }
        } catch (chartError) {
          console.error("❌ TradingView chart error:", chartError);
          
          // Show error message
          if (chartContainer) {
            chartContainer.innerHTML = `
              <div class="chart-error">
                <div>
                  <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">❌ Chart Error</div>
                  <div>Failed to load TradingView chart: ${chartError.message}</div>
                  <div style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7;">Using fallback display</div>
                </div>
              </div>
            `;
          }
        }
      } else {
        // Fallback to canvas chart
        if (chartContainer) {
          chartContainer.innerHTML = '<canvas id="priceChart" style="width: 100%; height: 300px;"></canvas>';
          
          const canvas = document.getElementById("priceChart");
          if (canvas) {
            const ctx = canvas.getContext("2d");
            
            // Set canvas size
            canvas.width = canvas.offsetWidth;
            canvas.height = 300;
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw price info
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            // Background
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Title
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 20px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${tokenSymbol}/ETH Price`, centerX, centerY - 60);
            
            // Price
            ctx.font = "bold 28px Inter, sans-serif";
            ctx.fillText(`${currentPrice.toFixed(8)}`, centerX, centerY - 20);
            
            // ETH label
            ctx.font = "16px Inter, sans-serif";
            ctx.fillStyle = "#888";
            ctx.fillText("ETH", centerX, centerY + 5);
            
            // Reserves info
            ctx.font = "14px Inter, sans-serif";
            ctx.fillText(`Token Reserve: ${Number(window.ethers.utils.formatUnits(tokenReserve, 18)).toFixed(2)}`, centerX, centerY + 35);
            ctx.fillText(`ETH Reserve: ${Number(window.ethers.utils.formatEther(ethReserve)).toFixed(4)}`, centerX, centerY + 55);
            
            // Note
            ctx.font = "12px Inter, sans-serif";
            ctx.fillStyle = "#666";
            ctx.fillText("Live candlestick charts coming soon!", centerX, centerY + 80);
          }
        }
      }
      
      if (chartStatus) chartStatus.textContent = "";
      
    } catch (err) {
      console.error("❌ Chart error:", err);
      
      if (chartContainer) {
        chartContainer.innerHTML = `
          <div class="chart-error">
            <div>
              <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">❌ Chart Error</div>
              <div>${err.message}</div>
            </div>
          </div>
        `;
      }
      
      if (chartStatus) {
        chartStatus.textContent = `Chart error: ${err.message}`;
        chartStatus.className = "status error";
      }
    }
  });
}

// ====== MY POOLS DISPLAY ======
async function renderMyPools() {
  const poolListDiv = document.getElementById("myPools");
  if (!poolListDiv) {
    console.log("❌ myPools element not found");
    return;
  }
  
  // Use global signer from app.js if available, otherwise use local signer
  const activeSigner = window.signer || signer;
  
  if (!dexContract || !activeSigner) {
    console.log("❌ DEX contract or signer not available");
    poolListDiv.innerHTML = "Connect wallet to view your pools";
    return;
  }
  
  poolListDiv.innerHTML = "Loading pools...";
  console.log("🔍 Loading user pools...");
  
  try {
    const userAddress = await activeSigner.getAddress();
    console.log("👤 Checking pools for address:", userAddress);
    
    // Get liquidity events for user
    const filter = dexContract.filters.LiquidityAdded(userAddress);
    const events = await dexContract.queryFilter(filter, 0, "latest");
    console.log("📊 Found liquidity events:", events.length);
    
    // Get unique tokens
    const tokenSet = new Set(events.map(e => e.args.token));
    
    if (tokenSet.size === 0) {
      poolListDiv.innerHTML = "No pools found";
      return;
    }
    
    let html = '<table class="pool-table"><tr><th>Token</th><th>Token Balance</th><th>ETH Balance</th></tr>';
    
    for (const token of tokenSet) {
      try {
        const [tokenReserve, ethReserve] = await dexContract.getReserves(token);
        const tokenAmount = parseFloat(window.ethers.utils.formatUnits(tokenReserve, 18)).toFixed(4);
        const ethAmount = parseFloat(window.ethers.utils.formatEther(ethReserve)).toFixed(4);
        html += `<tr>
          <td title="${token}">${token.slice(0,8)}...${token.slice(-6)}</td>
          <td>${tokenAmount}</td>
          <td>${ethAmount}</td>
        </tr>`;
      } catch (reserveError) {
        console.warn("⚠️ Error getting reserves for token:", token, reserveError);
        html += `<tr>
          <td title="${token}">${token.slice(0,8)}...${token.slice(-6)}</td>
          <td>Error</td>
          <td>Error</td>
        </tr>`;
      }
    }
    
    html += '</table>';
    poolListDiv.innerHTML = html;
    console.log("✅ Pools rendered successfully");
    
  } catch (err) {
    console.error("❌ Pool loading error:", err);
    poolListDiv.innerHTML = `Error loading pools: ${err.message}`;
  }
}

// ====== MAIN INITIALIZATION ======
window.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Initializing DEX...");
  
  // Wait for ethers to be available
  if (!window.ethers) {
    console.warn("⚠️ Ethers.js not loaded yet, waiting...");
    setTimeout(() => window.location.reload(), 1000);
    return;
  }
  
  // Initialize DEX
  await initializeDEX();
  
  // Setup all functionality
  setupLPAutoCalculation();
  setupSwapTokenInfo();
  setupSwapAutoCalculation();
  setupChartTokenInfo();
  setupLPForm();
  setupSwapForm();
  setupChartForm();
  setupWETHFunctionality();
  
  // Load pools
  if (window.ethereum && window.ethereum.selectedAddress) {
    await renderMyPools();
    await updateWETHBalances();
  }
  
  // Load verified tokens
  await loadVerifiedTokens();
  
  // Set up periodic token list updates (every 15 seconds)
  setInterval(async () => {
    if (dexContract) {
      await loadVerifiedTokens();
    }
  }, 15000);
  
  console.log("✅ DEX initialization complete!");
});

// ====== WETH FUNCTIONALITY ======
async function updateWETHBalances() {
  if (!wethContract || !provider) return;
  
  try {
    const userAddress = await signer.getAddress();
    const wethBalance = await wethContract.balanceOf(userAddress);
    const ethBalance = await provider.getBalance(userAddress);
    
    document.getElementById('wethBalance').textContent = `${ethers.utils.formatEther(wethBalance)} WETH`;
    document.getElementById('wethEthBalance').textContent = `${ethers.utils.formatEther(ethBalance)} ETH`;
  } catch (error) {
    console.error("Error updating WETH balances:", error);
  }
}

function setupWETHFunctionality() {
  const wrapTab = document.getElementById('wrapTab');
  const unwrapTab = document.getElementById('unwrapTab');
  const wrapForm = document.getElementById('wrapForm');
  const wrapAmountLabel = document.getElementById('wrapAmountLabel');
  const wrapAmountHint = document.getElementById('wrapAmountHint');
  const wrapSubmitBtn = document.getElementById('wrapSubmitBtn');
  
  let isWrapMode = true;
  
  // Tab switching
  wrapTab.addEventListener('click', () => {
    isWrapMode = true;
    wrapTab.classList.add('active');
    unwrapTab.classList.remove('active');
    wrapTab.style.background = '#333';
    wrapTab.style.color = 'white';
    unwrapTab.style.background = '#222';
    unwrapTab.style.color = '#888';
    
    wrapAmountLabel.textContent = 'ETH Amount to Wrap:';
    wrapAmountHint.textContent = 'Enter amount to wrap into WETH';
    wrapSubmitBtn.textContent = 'Wrap ETH';
  });
  
  unwrapTab.addEventListener('click', () => {
    isWrapMode = false;
    unwrapTab.classList.add('active');
    wrapTab.classList.remove('active');
    unwrapTab.style.background = '#333';
    unwrapTab.style.color = 'white';
    wrapTab.style.background = '#222';
    wrapTab.style.color = '#888';
    
    wrapAmountLabel.textContent = 'WETH Amount to Unwrap:';
    wrapAmountHint.textContent = 'Enter amount to unwrap into ETH';
    wrapSubmitBtn.textContent = 'Unwrap WETH';
  });
  
  // Form submission
  wrapForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = document.getElementById('wrapAmount').value;
    const statusDiv = document.getElementById('wrapStatus');
    
    if (!amount || amount <= 0) {
      statusDiv.innerHTML = '<div class="error">Please enter a valid amount</div>';
      return;
    }
    
    try {
      statusDiv.innerHTML = '<div class="loading">Processing transaction...</div>';
      
      if (isWrapMode) {
        // Wrap ETH to WETH
        const amountWei = ethers.utils.parseEther(amount);
        const tx = await wethContract.deposit({ value: amountWei });
        
        statusDiv.innerHTML = '<div class="loading">Wrapping ETH... Please wait for confirmation.</div>';
        await tx.wait();
        
        statusDiv.innerHTML = `<div class="success">Successfully wrapped ${amount} ETH to WETH!</div>`;
      } else {
        // Unwrap WETH to ETH
        const amountWei = ethers.utils.parseEther(amount);
        const tx = await wethContract.withdraw(amountWei);
        
        statusDiv.innerHTML = '<div class="loading">Unwrapping WETH... Please wait for confirmation.</div>';
        await tx.wait();
        
        statusDiv.innerHTML = `<div class="success">Successfully unwrapped ${amount} WETH to ETH!</div>`;
      }
      
      // Clear form and update balances
      document.getElementById('wrapAmount').value = '';
      await updateWETHBalances();
      
      // Clear status after 5 seconds
      setTimeout(() => {
        statusDiv.innerHTML = '';
      }, 5000);
      
    } catch (error) {
      console.error('WETH operation error:', error);
      let errorMessage = 'Transaction failed';
      
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient balance';
      }
      
      statusDiv.innerHTML = `<div class="error">${errorMessage}</div>`;
    }
  });
}

// ====== MINT USDC FUNCTIONALITY ======
function setupMintUSDCForm() {
  console.log("🔧 Setting up Mint USDC form...");
  const mintButton = document.getElementById("mintUSDCButton");
  const mintStatus = document.getElementById("mintUSDCStatus");
  const mintText = document.getElementById("mintUSDCText");
  const availableMints = document.getElementById("availableMints");
  
  if (!mintButton) {
    console.log("❌ Mint USDC button not found!");
    return;
  }
  
  console.log("✅ Mint USDC form found, setting up...");

  // Update available mints periodically
  async function updateAvailableMints() {
    if (!mintUSDCContract) return;
    
    try {
      const mints = await mintUSDCContract.getAvailableMints();
      if (availableMints) {
        availableMints.textContent = mints.toString();
        
        // Enable/disable button based on availability
        if (mints.gt(0)) {
          mintButton.disabled = false;
          mintText.textContent = "Mint 33 USDC";
        } else {
          mintButton.disabled = true;
          mintText.textContent = "No USDC Available";
        }
      }
    } catch (error) {
      console.error("Error fetching available mints:", error);
      if (availableMints) availableMints.textContent = "Error";
    }
  }

  // Initial update
  updateAvailableMints();
  
  // Update every 10 seconds
  setInterval(updateAvailableMints, 10000);

  mintButton.addEventListener("click", async () => {
    if (!mintUSDCContract || !signer) {
      if (mintStatus) {
        mintStatus.textContent = "Contract not initialized or wallet not connected!";
        mintStatus.className = "status error";
      }
      return;
    }

    try {
      if (mintStatus) {
        mintStatus.textContent = "Checking balances...";
        mintStatus.className = "status";
      }

      // Check user's GJ balance
      const userAddress = await signer.getAddress();
      const gjTokenAddress = "0x6B7ca0E7dDED09492ecC281d4Bf8C4c872C89c8E"; // GJ token address
      const gjContract = new window.ethers.Contract(gjTokenAddress, ERC20_ABI, signer);
      
      const gjBalance = await gjContract.balanceOf(userAddress);
      const requiredGJ = window.ethers.utils.parseUnits("0.666", 18); // 0.666 GJ
      
      if (gjBalance.lt(requiredGJ)) {
        if (mintStatus) {
          mintStatus.textContent = `Insufficient GJ balance! Need 0.666 GJ, have ${window.ethers.utils.formatEther(gjBalance)}`;
          mintStatus.className = "status error";
        }
        return;
      }

      // Check allowance
      const allowance = await gjContract.allowance(userAddress, mintUSDCAddress);
      if (allowance.lt(requiredGJ)) {
        if (mintStatus) {
          mintStatus.textContent = "Approving GJ tokens...";
          mintStatus.className = "status";
        }
        
        const approveTx = await gjContract.approve(mintUSDCAddress, requiredGJ);
        await approveTx.wait();
      }

      // Mint USDC
      if (mintStatus) {
        mintStatus.textContent = "Minting USDC...";
        mintStatus.className = "status";
      }

      const tx = await mintUSDCContract.mintUSDC();
      await tx.wait();

      if (mintStatus) {
        mintStatus.textContent = "✅ Successfully minted 33 USDC! 0.666 GJ burned.";
        mintStatus.className = "status success";
      }

      // Update balances
      if (typeof window.updateBalancesQuick === 'function') {
        await window.updateBalancesQuick();
      }

      // Update available mints
      await updateAvailableMints();

    } catch (error) {
      console.error("❌ Mint USDC error:", error);
      if (mintStatus) {
        mintStatus.textContent = `Mint error: ${error.message}`;
        mintStatus.className = "status error";
      }
    }
  });
}

// ====== DEPOSIT USDC FUNCTIONALITY ======
function setupDepositUSDCForm() {
  console.log("🔧 Setting up Deposit USDC form...");
  const depositButton = document.getElementById("depositUSDCButton");
  const depositStatus = document.getElementById("depositUSDCStatus");
  const depositAmountInput = document.getElementById("depositAmount");
  const poolUSDCBalance = document.getElementById("poolUSDCBalance");
  const userDeposits = document.getElementById("userDeposits");
  const totalDeposits = document.getElementById("totalDeposits");
  
  if (!depositButton) {
    console.log("❌ Deposit USDC button not found!");
    return;
  }
  
  console.log("✅ Deposit USDC form found, setting up...");

  // Update deposit info periodically
  async function updateDepositInfo() {
    if (!mintUSDCContract || !signer) return;
    
    try {
      const userAddress = await signer.getAddress();
      
      // Get contract USDC balance
      const contractBalance = await mintUSDCContract.getUSDCBalance();
      if (poolUSDCBalance) {
        poolUSDCBalance.textContent = `${window.ethers.utils.formatUnits(contractBalance, 6)} USDC`;
      }
      
      // Get user deposits
      const userDeposit = await mintUSDCContract.getUserDeposit(userAddress);
      if (userDeposits) {
        userDeposits.textContent = `${window.ethers.utils.formatUnits(userDeposit, 6)} USDC`;
      }
      
      // Get total deposits
      const totalDeposit = await mintUSDCContract.getTotalDeposits();
      if (totalDeposits) {
        totalDeposits.textContent = `${window.ethers.utils.formatUnits(totalDeposit, 6)} USDC`;
      }
      
      console.log("✅ Updated deposit info:", {
        poolBalance: window.ethers.utils.formatUnits(contractBalance, 6),
        userDeposit: window.ethers.utils.formatUnits(userDeposit, 6),
        totalDeposit: window.ethers.utils.formatUnits(totalDeposit, 6)
      });
    } catch (error) {
      console.error("Error fetching deposit info:", error);
    }
  }

  // Export updateDepositInfo globally
  window.updateDepositInfo = updateDepositInfo;

  // Initial update
  updateDepositInfo();
  
  // Update every 10 seconds
  setInterval(updateDepositInfo, 10000);

  depositButton.addEventListener("click", async () => {
    if (!mintUSDCContract || !signer) {
      console.error("Contract or signer not available");
      return;
    }

    const amount = depositAmountInput.value;
    if (!amount || parseFloat(amount) <= 0) {
      if (depositStatus) {
        depositStatus.textContent = "Please enter a valid amount";
        depositStatus.className = "status error";
      }
      return;
    }

    try {
      depositButton.disabled = true;
      if (depositStatus) {
        depositStatus.textContent = "Processing deposit...";
        depositStatus.className = "status";
      }

      // Convert amount to proper units (6 decimals for USDC)
      const amountInWei = window.ethers.utils.parseUnits(amount, 6);
      
      // Check user's USDC balance
      const userAddress = await signer.getAddress();
      const usdcTokenAddress = "0x2f3463756C59387D6Cd55b034100caf7ECfc757b"; // USDC token address
      const usdcContract = new window.ethers.Contract(usdcTokenAddress, ERC20_ABI, signer);
      
      const usdcBalance = await usdcContract.balanceOf(userAddress);
      
      if (usdcBalance.lt(amountInWei)) {
        if (depositStatus) {
          depositStatus.textContent = `Insufficient USDC balance! Need ${amount} USDC, have ${window.ethers.utils.formatUnits(usdcBalance, 6)}`;
          depositStatus.className = "status error";
        }
        depositButton.disabled = false;
        return;
      }

      // Check allowance
      const allowance = await usdcContract.allowance(userAddress, mintUSDCContract.address);
      
      if (allowance.lt(amountInWei)) {
        if (depositStatus) {
          depositStatus.textContent = "Approving USDC...";
          depositStatus.className = "status";
        }
        
        const approveTx = await usdcContract.approve(mintUSDCContract.address, amountInWei);
        await approveTx.wait();
      }

      // Deposit USDC
      if (depositStatus) {
        depositStatus.textContent = "Depositing USDC...";
        depositStatus.className = "status";
      }
      
      const tx = await mintUSDCContract.depositUSDC(amountInWei);
      await tx.wait();

      if (depositStatus) {
        depositStatus.textContent = `✅ Successfully deposited ${amount} USDC!`;
        depositStatus.className = "status success";
      }
      
      // Clear input
      depositAmountInput.value = "";
      
      // Update info immediately
      setTimeout(updateDepositInfo, 2000);
      
      // Update available mints in mint form
      if (window.updateAvailableMints) {
        window.updateAvailableMints();
      }
      
      // Update balances
      if (typeof window.updateBalancesQuick === 'function') {
        await window.updateBalancesQuick();
      }

    } catch (error) {
      console.error("Deposit failed:", error);
      if (depositStatus) {
        depositStatus.textContent = `❌ Deposit failed: ${error.message || error}`;
        depositStatus.className = "status error";
      }
    } finally {
      depositButton.disabled = false;
    }
  });
}

// ====== GLOBAL EXPORTS ======
window.renderMyPools = renderMyPools;
window.initializeDEX = initializeDEX;
window.dexContract = dexContract;
window.wethContract = wethContract;
window.mintUSDCContract = mintUSDCContract;
window.loadVerifiedTokens = loadVerifiedTokens;
window.copyToClipboard = copyToClipboard;
window.toggleFavorite = toggleFavorite;
window.updateWETHBalances = updateWETHBalances;
window.setupWETHFunctionality = setupWETHFunctionality;
window.setupMintUSDCForm = setupMintUSDCForm;
window.setupDepositUSDCForm = setupDepositUSDCForm;
window.updateDepositInfo = updateDepositInfo;
