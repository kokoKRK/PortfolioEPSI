import 'package:flutter/material.dart';
import '../models/boisson.dart';
import '../models/boisson_data.dart';
import 'boisson_details.dart';

class BoissonList extends StatefulWidget {
  const BoissonList({super.key});

  @override
  State<BoissonList> createState() => _BoissonListState();
}

class _BoissonListState extends State<BoissonList> {
  late List<Boisson> boissons;

  @override
  void initState() {
    super.initState();
    boissons = BoissonData.buildBoissons();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nos boissons'),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(8),
        itemCount: boissons.length,
        itemExtent: 200,
        itemBuilder: (context, index) {
          final boisson = boissons[index];
          return _buildBoissonCard(boisson);
        },
      ),
    );
  }

  Widget _buildBoissonCard(Boisson boisson) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => BoissonDetails(boisson: boisson),
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
                boisson.title,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              subtitle: Text('${boisson.price.toStringAsFixed(2)} €'),
            ),
            Expanded(
              child: ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(bottom: Radius.circular(16)),
                child: Image.asset(
                  boisson.image,
                  fit: BoxFit.cover,
                  width: double.infinity,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
