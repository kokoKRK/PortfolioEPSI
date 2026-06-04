import 'pizza.dart';

class PizzaData {
  static List<Pizza> buildPizzas() {
    return [
      Pizza(
        id: 1,
        title: 'Barbecue',
        description: 'Sauce BBQ, poulet, oignons, fromage',
        image: 'assets/images/pizzas/pizza-bbq.jpg',
        price: 8.50,
      ),
      Pizza(
        id: 2,
        title: 'Hawaï',
        description: 'Jambon, ananas, mozzarella',
        image: 'assets/images/pizzas/pizza-hawai.jpg',
        price: 9.50,
      ),
      Pizza(
        id: 3,
        title: 'Végétarienne',
        description: 'Tomates, poivrons, champignons, olives',
        image: 'assets/images/pizzas/pizza-vegetable.jpg',
        price: 8.90,
      ),
      // tu peux en rajouter d'autres...
    ];
  }
}
