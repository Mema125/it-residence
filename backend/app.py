from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({"message": "Bienvenue sur mon API"})

@app.route('/users', methods=['GET'])
def users():
    return jsonify([
        {"id": 1, "nom": "phanuel"},
        {"id": 2, "nom": "Marie"}
    ])

@app.route('/users', methods=['POST'])
def create_user():
    data = request.json
    return jsonify({"message": "Mema", "data": data}), 201

if __name__ == '__main__':
    app.run(debug=True)