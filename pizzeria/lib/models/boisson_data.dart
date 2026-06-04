import 'boisson.dart';

class BoissonData {
  static List<Boisson> buildBoissons() {
    return [
      Boisson(
        id: 1,
        title: 'Coca-Cola',
        image: 'assets/images/menus/boisson.png',
        price: 2.5,
      ),
      Boisson(
        id: 2,
        title: 'Ice Tea',
        image: 'assets/images/menus/boisson.png',
        price: 2.3,
      ),
      Boisson(
        id: 3,
        title: 'Eau pétillante',
        image: 'assets/images/menus/boisson.png',
        price: 1.8,
      ),
    ];
  }
}
