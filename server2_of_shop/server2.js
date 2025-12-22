const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

const PORT = 4000;

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

// POST endpoint to save purchases
app.post('/buy', (req, res) => {
  let buys = [];

  fs.readFile('buy.json', 'utf8', (err, data) => {
    if (!err && data) {
      try {
        buys = JSON.parse(data);
        if (!Array.isArray(buys)) buys = [];
      } catch {
        buys = [];
      }
    }

    // Ensure body is an array
    const newBuys = Array.isArray(req.body) ? req.body : [req.body];
    const finalBuys = newBuys.map(item => ({
      ...item,
      date: new Date().toISOString()
    }));

    buys.push(...finalBuys);

    fs.writeFile('buy.json', JSON.stringify(buys, null, 2), (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Erreur serveur');
      }
      res.send({ message: 'Achat enregistré avec succès!', buysSaved: finalBuys.length });
    });
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
