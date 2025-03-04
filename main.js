const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const io = require('socket.io-client');

// Establish a connection to the server
const socket = io('http://192.168.1.9:3000');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Listen for requests from the renderer process to fetch data
ipcMain.on('fetch-orders', () => {
  socket.emit('getAllPendingOrders', (orders) => {
    // Send the orders data back to the renderer process
    BrowserWindow.getAllWindows()[0].webContents.send('orders-data', orders);
  });
});

// Handle order completion from the KDS
ipcMain.on('finish-order', (event, tableNumber) => {
  console.log(`Main process: Order at table ${tableNumber} marked as finished`);
  
  // Find the order ID by table number
  socket.emit('getAllPendingOrders', (orders) => {
    const order = orders.find(o => o.tableNumber == tableNumber);
    
    if (order) {
      console.log(`Found order with ID ${order.id} for table ${tableNumber}`);
      
      // Update the order status to completed
      socket.emit('completeOrder', order.id, (response) => {
        if (response.success) {
          console.log(`Successfully completed order for table ${tableNumber}`);
        } else {
          console.error(`Error completing order: ${response.message}`);
        }
      });
    } else {
      console.error(`No order found for table ${tableNumber}`);
    }
  });
});
