package in.stellarforge.billing.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import in.stellarforge.billing.data.model.Item
import in.stellarforge.billing.ui.viewmodels.ItemsViewModel

@Composable
fun ItemsScreen(viewModel: ItemsViewModel = hiltViewModel()) {
    val items by viewModel.filteredItems.collectAsState()
    val search by viewModel.search.collectAsState()
    var showAddSheet by remember { mutableStateOf(false) }
    var newItemName by remember { mutableStateOf("") }

    Scaffold(
        containerColor = Color(0xFF0D1117),
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddSheet = true }, containerColor = Color(0xFF00C9A7)) {
                Icon(Icons.Default.Add, contentDescription = "Add Item", tint = Color.Black)
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            Text("Items", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = search, onValueChange = viewModel::updateSearch,
                placeholder = { Text("Search items...", color = Color(0xFF8B949E)) },
                singleLine = true, modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                    focusedBorderColor = Color(0xFF00C9A7), unfocusedBorderColor = Color(0xFF30363D),
                    cursorColor = Color(0xFF00C9A7)
                )
            )
            Spacer(Modifier.height(12.dp))
            if (items.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No items yet. Tap + to add.", color = Color(0xFF8B949E))
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(items, key = { it.id }) { item ->
                        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
                            Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Text("📦", fontSize = 18.sp)
                                Spacer(Modifier.width(12.dp))
                                Text(item.name, color = Color.White, modifier = Modifier.weight(1f), fontSize = 15.sp)
                                IconButton(onClick = { viewModel.deleteItem(item) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color(0xFFFF6B6B))
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddSheet) {
        AlertDialog(
            onDismissRequest = { showAddSheet = false; newItemName = "" },
            containerColor = Color(0xFF161B22),
            title = { Text("Add Item", color = Color.White) },
            text = {
                OutlinedTextField(
                    value = newItemName, onValueChange = { newItemName = it },
                    label = { Text("Item name", color = Color(0xFF8B949E)) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF00C9A7), unfocusedBorderColor = Color(0xFF30363D)
                    )
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newItemName.isNotBlank()) {
                            viewModel.addItem(newItemName)
                            newItemName = ""; showAddSheet = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C9A7))
                ) { Text("Add", color = Color.Black) }
            },
            dismissButton = {
                TextButton(onClick = { showAddSheet = false; newItemName = "" }) { Text("Cancel", color = Color(0xFF8B949E)) }
            }
        )
    }
}
