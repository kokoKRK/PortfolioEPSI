import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/cart.dart';

class CommandePage extends StatefulWidget {
  const CommandePage({super.key});

  @override
  State<CommandePage> createState() => _CommandePageState();
}

class _CommandePageState extends State<CommandePage> {
  String _livraisonMode = 'livraison';
  String _paymentMode = 'cb';

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Validation de la commande'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Mode de réception :',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            RadioListTile<String>(
              title: const Text('Livraison à domicile'),
              value: 'livraison',
              groupValue: _livraisonMode,
              onChanged: (value) {
                setState(() {
                  _livraisonMode = value!;
                });
              },
            ),
            RadioListTile<String>(
              title: const Text('À emporter (click & collect)'),
              value: 'collect',
              groupValue: _livraisonMode,
              onChanged: (value) {
                setState(() {
                  _livraisonMode = value!;
                });
              },
            ),

            const SizedBox(height: 20),

            const Text(
              'Mode de paiement :',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            RadioListTile<String>(
              title: const Text('Carte bancaire'),
              value: 'cb',
              groupValue: _paymentMode,
              onChanged: (value) {
                setState(() {
                  _paymentMode = value!;
                });
              },
            ),
            RadioListTile<String>(
              title: const Text('Espèces'),
              value: 'cash',
              groupValue: _paymentMode,
              onChanged: (value) {
                setState(() {
                  _paymentMode = value!;
                });
              },
            ),

            const SizedBox(height: 20),

            Text(
              'Total TTC : ${cart.totalTTC.toStringAsFixed(2)} €',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),

            const Spacer(),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: cart.isEmpty
                    ? null
                    : () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Commande validée ✅ (simulation)'),
                          ),
                        );
                      },
                child: const Text('Confirmer la commande'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
