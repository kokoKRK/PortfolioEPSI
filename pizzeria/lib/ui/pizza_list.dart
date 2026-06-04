import 'package:flutter/material.dart';
import '../models/pizza.dart';
import '../models/pizza_data.dart';
import 'pizza_details.dart';

class PizzaList extends StatefulWidget {
  const PizzaList({super.key});

  @override
  State<PizzaList> createState() => _PizzaListState();
}

class _PizzaListState extends State<PizzaList> {
  late List<Pizza> pizzas;

  @override
  void initState() {
    super.initState();
    pizzas = PizzaData.buildPizzas();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nos pizzas'),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(8),
        itemCount: pizzas.length,
        itemExtent: 280,
        itemBuilder: (context, index) {
          final pizza = pizzas[index];
          return _buildPizzaCard(pizza);
        },
      ),
    );
  }

  Widget _buildPizzaCard(Pizza pizza) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          PageRouteBuilder(
            pageBuilder: (_, animation, secondaryAnimation) =>
                PizzaDetails(pizza: pizza),
            transitionsBuilder: (_, animation, __, child) {
              final fadeTween = Tween<double>(begin: 0.0, end: 1.0);
              final scaleTween = Tween<double>(begin: 0.95, end: 1.0);

              return FadeTransition(
                opacity: animation.drive(fadeTween),
                child: ScaleTransition(
                  scale: animation.drive(scaleTween),
                  child: child,
                ),
              );
            },
          ),
        );
      },
      child: Card(
        margin: const EdgeInsets.symmetric(vertical: 8),
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ListTile(
              title: Text(
                pizza.title,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              subtitle: Text('${pizza.price.toStringAsFixed(2)} €'),
            ),
            SizedBox(
              height: 140,
              child: Hero(
                tag: 'pizza-image-${pizza.id}',
                child: Image.asset(
                  pizza.image,
                  fit: BoxFit.cover,
                  width: double.infinity,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Text(pizza.description),
            ),
          ],
        ),
      ),
    );
  }
}
