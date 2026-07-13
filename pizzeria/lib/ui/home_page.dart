import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/menu.dart';
import '../models/cart.dart';
import '../models/theme_notifier.dart';
import 'pizza_list.dart';
import 'panier.dart';
import 'boisson_list.dart';
import 'profil_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  // Liste des entrées du menu principal
  final List<Menu> menus = const [
    Menu(
      title: 'Pizzas',
      image: 'assets/images/menus/pizza.png',
      color: Colors.redAccent,
    ),
    Menu(
      title: 'Boissons',
      image: 'assets/images/menus/boisson.png',
      color: Colors.blueAccent,
    ),
    Menu(
      title: 'Desserts',
      image: 'assets/images/menus/dessert.png',
      color: Colors.purpleAccent,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    // On écoute le panier pour le badge
    final cart = context.watch<Cart>();
    // On écoute le thème pour l’icône
    final themeNotifier = context.watch<ThemeNotifier>();

    return Scaffold(
      appBar: AppBar(
        title: const Text("Notre Pizzeria"),
        actions: [
          // Bouton thème clair/sombre
          IconButton(
            icon: Icon(
              themeNotifier.isDarkMode ? Icons.dark_mode : Icons.light_mode,
            ),
            onPressed: () {
              themeNotifier.toggleTheme();
            },
          ),
          // Icône panier + badge
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const PanierPage(),
                    ),
                  );
                },
              ),
              if (!cart.isEmpty)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      cart.items.length.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: ListView.builder(
        itemCount: menus.length,
        itemExtent: 180, // hauteur de chaque carte de menu
        itemBuilder: (context, index) {
          final menu = menus[index];
          return _buildMenuItem(context, menu);
        },
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 0, // on est sur l'accueil
        onTap: (index) {
          if (index == 1) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const ProfilPage(),
              ),
            );
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Accueil',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(BuildContext context, Menu menu) {
    return GestureDetector(
      onTap: () {
        if (menu.title == 'Pizzas') {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const PizzaList(),
            ),
          );
        } else if (menu.title == 'Boissons') {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const BoissonList(),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Page ${menu.title} à venir 😉')),
          );
        }
      },
      child: Container(
        margin: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: menu.color,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          children: [
            // Image du menu
            Expanded(
              child: ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(20)),
                child: Image.asset(
                  menu.image,
                  fit: BoxFit.cover,
                  width: double.infinity,
                ),
              ),
            ),
            // Titre du menu
            Container(
              height: 40,
              alignment: Alignment.center,
              child: Text(
                menu.title,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
