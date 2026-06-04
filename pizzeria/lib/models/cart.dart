import 'package:flutter/foundation.dart';
import 'cart_item.dart';
import 'pizza.dart';

class Cart extends ChangeNotifier {
  final List<CartItem> items = [];

  void add(Pizza pizza, double price) {
    items.add(CartItem(pizza: pizza, price: price));
    notifyListeners(); // prévient les widgets que le panier a changé
  }

  void clear() {
    items.clear();
    notifyListeners();
  }

  double get totalTTC {
    return items.fold(0.0, (sum, item) => sum + item.price);
  }

  double get totalHT {
    return totalTTC / 1.10; // TVA 10%
  }

  double get tva {
    return totalTTC - totalHT;
  }

  bool get isEmpty => items.isEmpty;
}
