import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/cart.dart';
import 'commande_page.dart';

class PanierPage extends StatelessWidget {
  const PanierPage({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Panier'),
      ),
      body: cart.isEmpty
          ? const Center(
              child: Text(
                'Votre panier est vide 😢',
                style: TextStyle(fontSize: 18),
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    itemCount: cart.items.length,
                    itemBuilder: (context, index) {
                      final item = cart.items[index];
                      return ListTile(
                        leading: const Icon(Icons.local_pizza),
                        title: Text(item.pizza.title),
                        subtitle: Text(
                          '${item.price.toStringAsFixed(2)} €',
                        ),
                      );
                    },
                  ),
                ),

                const Divider(),

                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Total HT : ${cart.totalHT.toStringAsFixed(2)} €',
                        style: const TextStyle(fontSize: 16),
                      ),
                      Text(
                        'TVA (10%) : ${cart.tva.toStringAsFixed(2)} €',
                        style: const TextStyle(fontSize: 16),
                      ),
                      Text(
                        'Total TTC : ${cart.totalTTC.toStringAsFixed(2)} €',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: cart.isEmpty
                            ? null
                            : () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const CommandePage(),
                                  ),
                                );
                              },
                        child: const Text('Valider la commande'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
