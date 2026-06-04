import 'package:flutter/material.dart';
import '../models/boisson.dart';
import 'share/total_widget.dart';

class BoissonDetails extends StatefulWidget {
  final Boisson boisson;

  const BoissonDetails({super.key, required this.boisson});

  @override
  State<BoissonDetails> createState() => _BoissonDetailsState();
}

class _BoissonDetailsState extends State<BoissonDetails> {
  double _quantity = 1; // entre 1 et 3
  double _coldLevel = 0.5; // 0 = peu froid, 1 = très froid
  bool _withIce = true;

  double get total {
    final base = widget.boisson.price * _quantity;
    final iceExtra = _withIce ? 0.2 : 0.0;
    return base + iceExtra;
  }

  String get coldLabel {
    if (_coldLevel < 0.33) return 'Peu frais';
    if (_coldLevel < 0.66) return 'Frais';
    return 'Très frais';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.boisson.title),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Image.asset(
                widget.boisson.image,
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),

            const SizedBox(height: 20),

            Text(
              'Boisson fraîche et désaltérante, idéale pour accompagner votre pizza.',
              style: const TextStyle(fontSize: 16),
            ),

            const SizedBox(height: 20),

            // Quantité : SliderTheme + Slider
            const Text(
              'Quantité (nombre de verres) :',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SliderTheme(
              data: SliderTheme.of(context).copyWith(
                trackHeight: 6,
                thumbShape:
                    const RoundSliderThumbShape(enabledThumbRadius: 10),
              ),
              child: Slider(
                value: _quantity,
                min: 1,
                max: 3,
                divisions: 2,
                label: _quantity.toStringAsFixed(0),
                onChanged: (value) {
                  setState(() {
                    _quantity = value;
                  });
                },
              ),
            ),
            Text('$_quantity verre(s)'),

            const SizedBox(height: 20),

            // Niveau de fraîcheur : Slider
            const Text(
              'Niveau de fraîcheur :',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Slider(
              value: _coldLevel,
              min: 0,
              max: 1,
              onChanged: (value) {
                setState(() {
                  _coldLevel = value;
                });
              },
            ),
            Text(coldLabel),

            const SizedBox(height: 20),

            // Glaçons : SwitchListTile
            SwitchListTile(
              title: const Text('Avec glaçons (+0.20€)'),
              value: _withIce,
              onChanged: (value) {
                setState(() {
                  _withIce = value;
                });
              },
            ),

            const SizedBox(height: 20),

            TotalWidget(total: total),

            const SizedBox(height: 20),

            Center(
              child: ElevatedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Boisson ${widget.boisson.title} ajoutée (démo, pas liée au panier) 🥤',
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.local_drink),
                label: const Text('Ajouter la boisson'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
