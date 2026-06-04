import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/pizza.dart';
import '../../models/cart.dart';
import '../panier.dart';

class BuyButtonWidget extends StatelessWidget {
  final Pizza pizza;
  final double total;

  const BuyButtonWidget({
    super.key,
    required this.pizza,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: () {
        final cart = Provider.of<Cart>(context, listen: false);
        cart.add(pizza, total);

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => const PanierPage(),
          ),
        );
      },
      icon: const Icon(Icons.shopping_cart),
      label: const Text("Commander"),
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
        textStyle: const TextStyle(fontSize: 18),
      ),
    );
  }
}
