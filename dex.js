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
	}
];

const dexAddress = "0x09b98f0a16f0BA62DcFf31A4650Ac8873a492CCF";

// ====== GLOBAL VARIABLES ======
let provider, signer, dexContract;
let isInitialized = false;

// ====== INITIALIZATION ======
async function initializeDEX() {
  if (isInitialized) return;
  
  try {
    if (window.ethereum && window.ethers) {
      provider = new window.ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      
      if (dexAbi.length && dexAddress) {
        dexContract = new window.ethers.Contract(dexAddress, dexAbi, signer);
        console.log("✅ DEX contract initialized:", dexAddress);
      }
      
      isInitialized = true;
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
  
  const handleSwapTokenChange = debounce(async (tokenAddress) => {
    if (tokenInfoDiv) tokenInfoDiv.innerHTML = "";
    if (swapPreview) swapPreview.innerHTML = "";
    
    if (!window.ethers.utils.isAddress(tokenAddress)) return;
    
    try {
      const tokenInfo = await getTokenInfo(tokenAddress);
      if (tokenInfo && tokenInfoDiv) {
        tokenInfoDiv.innerHTML = `<span class="token-name">${tokenInfo.name} (${tokenInfo.symbol})</span>`;
        
        // Update swap preview and trigger calculation
        updateSwapPreview();
      }
    } catch (error) {
      console.error("❌ Swap token info error:", error);
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
  
  // Update label based on direction
  const updateLabel = () => {
    const direction = directionSelect.value;
    if (amountLabel) {
      amountLabel.textContent = direction === "ethToToken" ? "ETH Amount:" : "Token Amount:";
    }
    if (amountHint) {
      amountHint.textContent = direction === "ethToToken" ? "Enter ETH amount to buy tokens" : "Enter token amount to sell for ETH";
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
  tokenAddressInput.addEventListener("input", updateCalculation);
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
  const swapForm = document.getElementById("swapForm");
  if (!swapForm) return;
  
  swapForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const swapStatus = document.getElementById("swapStatus");
    if (swapStatus) swapStatus.textContent = "";
    
    if (!dexContract) {
      if (swapStatus) {
        swapStatus.textContent = "DEX contract not configured!";
        swapStatus.className = "status error";
      }
      return;
    }
    
    const tokenAddress = document.getElementById("swapTokenAddress").value.trim();
    const direction = document.getElementById("swapDirection").value;
    const amount = document.getElementById("swapAmount").value.trim();
    
    // Validation
    if (!window.ethers.utils.isAddress(tokenAddress)) {
      if (swapStatus) {
        swapStatus.textContent = "Invalid token address!";
        swapStatus.className = "status error";
      }
      return;
    }
    
    if (isNaN(amount) || Number(amount) <= 0) {
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
        
        const allowance = await erc20.allowance(userAddress, dexAddress);
        if (allowance.lt(tokenAmountWei)) {
          if (swapStatus) swapStatus.textContent = "Approving token...";
          const approveTx = await erc20.approve(dexAddress, tokenAmountWei);
          await approveTx.wait();
        }
        
        if (swapStatus) swapStatus.textContent = "Swapping Token to ETH...";
        
        const tx = await dexContract.swapTokenToEth(tokenAddress, tokenAmountWei);
        await tx.wait();
        
        if (swapStatus) {
          swapStatus.textContent = "Swap Token to ETH successful!";
          swapStatus.className = "status success";
        }
      }
      
    } catch (err) {
      console.error("❌ Swap error:", err);
      if (swapStatus) {
        swapStatus.textContent = `Swap error: ${err.message}`;
        swapStatus.className = "status error";
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
  setupLPForm();
  setupSwapForm();
  
  // Load pools
  if (window.ethereum && window.ethereum.selectedAddress) {
    await renderMyPools();
  }
  
  console.log("✅ DEX initialization complete!");
});

// ====== GLOBAL EXPORTS ======
window.renderMyPools = renderMyPools;
window.initializeDEX = initializeDEX;
