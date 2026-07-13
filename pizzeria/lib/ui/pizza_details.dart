import 'package:flutter/material.dart';
import '../models/pizza.dart';
import 'share/total_widget.dart';
import 'share/buy_button_widget.dart';

class PizzaDetails extends StatefulWidget {
  final Pizza pizza;

  const PizzaDetails({
    super.key,
    required this.pizza,
  });

  @override
  State<PizzaDetails> createState() => _PizzaDetailsState();
}

class _PizzaDetailsState extends State<PizzaDetails> {
  String selectedSize = 'Moyenne';
  double sizePrice = 0;

  String selectedPate = 'Classique';
  double patePrice = 0;

  String selectedSauce = 'Tomate';
  double saucePrice = 0;

  double get total {
    return widget.pizza.price + sizePrice + patePrice + saucePrice;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.pizza.title),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Hero(
              tag: 'pizza-image-${widget.pizza.id}',
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Image.asset(
                  widget.pizza.image,
                  width: double.infinity,
                  height: 200,
                  fit: BoxFit.cover,
                ),
              ),
            ),

            const SizedBox(height: 20),

            Text(
              widget.pizza.description,
              style: const TextStyle(fontSize: 16),
            ),

            const SizedBox(height: 20),

            const Text(
              "Taille :",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            DropdownButton<String>(
              value: selectedSize,
              items: const [
                DropdownMenuItem(
                  value: 'Petite',
                  child: Text("Petite (+0€)"),
                ),
                DropdownMenuItem(
                  value: 'Moyenne',
                  child: Text("Moyenne (+1€)"),
                ),
                DropdownMenuItem(
                  value: 'Grande',
                  child: Text("Grande (+2€)"),
                ),
              ],
              onChanged: (value) {
                setState(() {
                  selectedSize = value!;
                  sizePrice =
                      value == 'Petite' ? 0 : value == 'Moyenne' ? 1 : 2;
                });
              },
            ),

            const SizedBox(height: 20),

            const Text(
              "Pâte :",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            DropdownButton<String>(
              value: selectedPate,
              items: const [
                DropdownMenuItem(
                  value: 'Classique',
                  child: Text("Classique (+0€)"),
                ),
                DropdownMenuItem(
                  value: 'Fine',
                  child: Text("Fine (+0.5€)"),
                ),
                DropdownMenuItem(
                  value: 'Epaisse',
                  child: Text("Épaisse (+1€)"),
                ),
              ],
              onChanged: (value) {
                setState(() {
                  selectedPate = value!;
                  patePrice =
                      value == 'Classique' ? 0 : value == 'Fine' ? 0.5 : 1;
                });
              },
            ),

            const SizedBox(height: 20),

            const Text(
              "Sauce :",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            DropdownButton<String>(
              value: selectedSauce,
              items: const [
                DropdownMenuItem(
                  value: 'Tomate',
                  child: Text("Tomate (+0€)"),
                ),
                DropdownMenuItem(
                  value: 'Crème',
                  child: Text("Crème (+1€)"),
                ),
                DropdownMenuItem(
                  value: 'BBQ',
                  child: Text("BBQ (+1.5€)"),
                ),
              ],
              onChanged: (value) {
                setState(() {
                  selectedSauce = value!;
                  saucePrice =
                      value == 'Tomate' ? 0 : value == 'Crème' ? 1 : 1.5;
                });
              },
            ),

            const SizedBox(height: 30),

            TotalWidget(total: total),

            const SizedBox(height: 20),

            Center(
              child: BuyButtonWidget(
                pizza: widget.pizza,
                total: total,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
