import 'pizza.dart';

class CartItem {
  final Pizza pizza;
  final double price; // prix total choisi (avec options)

  CartItem({
    required this.pizza,
    required this.price,
  });
}
