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
  
  // Load pools
  if (window.ethereum && window.ethereum.selectedAddress) {
    await renderMyPools();
  }
  
  console.log("✅ DEX initialization complete!");
});

// ====== GLOBAL EXPORTS ======
window.renderMyPools = renderMyPools;
window.initializeDEX = initializeDEX;
