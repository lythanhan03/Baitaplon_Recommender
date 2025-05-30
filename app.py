from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import requests
import pandas as pd
import numpy as np
from preprocess_data import DataPreprocessor
from collaborative import CollaborativeRecommender
from content_based import ContentBasedRecommender

# Khởi tạo Flask app
app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'])

# Tải cấu hình từ .env
load_dotenv()
mongo_uri = os.getenv('MONGO_URI')
tmdb_api_key = os.getenv('TMDB_API_KEY')
port = int(os.getenv('PORT', 5000))

# Khởi tạo các thành phần
print("Initializing data preprocessor...")
preprocessor = DataPreprocessor(mongo_uri)

# Tiền xử lý dữ liệu
print("Preprocessing data...")
ratings_df, movies_df, movie_id_mapping = preprocessor.load_csv_data()
ratings_df = preprocessor.sync_with_mongodb(ratings_df)
tmdb_info, movie_id_to_tmdb = preprocessor.get_mappings(movies_df, movie_id_mapping)

# Khởi tạo các recommender
print("Initializing collaborative recommender...")
collaborative_recommender = CollaborativeRecommender(ratings_df, tmdb_info, movie_id_to_tmdb)
print("Initializing content-based recommender...")
content_based_recommender = ContentBasedRecommender(movies_df)

# API để lấy tất cả đánh giá
@app.route('/api/ratings', methods=['GET'])
def get_all_ratings():
    try:
        ratings = list(preprocessor.ratings_collection.find({}, {'_id': 0}))
        # Sử dụng Pandas để kiểm tra dữ liệu
        ratings_df_temp = pd.DataFrame(ratings)
        if not ratings_df_temp.empty:
            print(f"Total ratings: {len(ratings_df_temp)}")
            print(f"Average rating: {ratings_df_temp['rating'].mean():.2f}")
        return jsonify(ratings), 200
    except Exception as e:
        print(f"Error in /api/ratings: {str(e)}")
        return jsonify({'error': 'Failed to fetch ratings', 'details': str(e)}), 500

# API để lấy danh sách đánh giá của người dùng
@app.route('/api/ratings/<userId>', methods=['GET'])
def get_user_ratings(userId):
    try:
        ratings = list(preprocessor.ratings_collection.find({'userId': userId}, {'_id': 0}))
        # Sử dụng NumPy để phân tích dữ liệu
        if ratings:
            ratings_df_temp = pd.DataFrame(ratings)
            ratings_array = np.array(ratings_df_temp['rating'])
            print(f"User {userId} has {len(ratings)} ratings, average: {np.mean(ratings_array):.2f}")
        return jsonify(ratings), 200
    except Exception as e:
        print(f"Error in /api/ratings/{userId}: {str(e)}")
        return jsonify({'error': 'Failed to fetch ratings', 'details': str(e)}), 500

# API để lưu đánh giá
@app.route('/api/ratings', methods=['POST'])
def save_rating():
    try:
        data = request.get_json()
        # Chuyển timestamp thành tz-naive
        timestamp = pd.to_datetime(data['timestamp']).tz_localize(None)
        rating = {
            'userId': data['userId'],
            'movieId': data['movieId'],
            'rating': data['rating'],
            'title': data.get('title', ''),
            'timestamp': timestamp.isoformat()  # Lưu dưới dạng chuỗi ISO
        }
        preprocessor.ratings_collection.insert_one(rating)
        # Cập nhật lại dữ liệu và mô hình
        global ratings_df, collaborative_recommender
        print("Updating data and model after new rating...")
        ratings_df = preprocessor.sync_with_mongodb(ratings_df)
        collaborative_recommender = CollaborativeRecommender(ratings_df, tmdb_info, movie_id_to_tmdb)
        return jsonify({'message': 'Rating saved successfully'}), 200
    except Exception as e:
        print(f"Error in /api/ratings (POST): {str(e)}")
        return jsonify({'error': 'Failed to save rating', 'details': str(e)}), 500

# API đề xuất phim (Collaborative Filtering)
@app.route('/recommend/collaborative', methods=['POST'])
def recommend_collaborative():
    print("Received request for /recommend/collaborative")
    try:
        data = request.get_json()
        user_id = data.get('userId')
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
        print(f"Checking if user {user_id} exists in ratings_df...")
        if user_id not in ratings_df['userId'].values:
            print(f"User {user_id} not found in ratings_df")
        print(f"Generating collaborative recommendations for user: {user_id}")
        recommendations = collaborative_recommender.get_recommendations(user_id)
        print(f"Collaborative recommendations: {recommendations}")
        return jsonify({'recommendations': recommendations}), 200
    except Exception as e:
        print(f"Error in /recommend/collaborative: {str(e)}")
        return jsonify({'error': 'Failed to generate recommendations', 'details': str(e)}), 500
# API đề xuất dựa trên nội dung (Content-Based)
@app.route('/recommend/content', methods=['GET'])
def recommend_content():
    print("Received request for /recommend/content")
    title = request.args.get("title")
    if not title:
        return jsonify({"error": "Title is required"}), 400
    
    try:
        print(f"Generating content-based recommendations for title: {title}")
        recommendations = content_based_recommender.get_recommendations(title)
        print(f"Content recommendations: {recommendations}")
        return jsonify({'recommendations': recommendations}), 200
    except Exception as e:
        print(f"Error in /recommend/content: {str(e)}")
        return jsonify({'error': 'Failed to generate recommendations', 'details': str(e)}), 500

# API để gọi TMDB
@app.route("/tmdb", methods=["GET"])
def get_tmdb_movies():
    print("Received request for /tmdb")
    query = request.args.get("query", "popular")
    try:
        response = requests.get(f"https://api.themoviedb.org/3/search/movie?api_key={tmdb_api_key}&query={query}")
        return jsonify(response.json()), 200
    except Exception as e:
        print(f"Error in /tmdb: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print(f"Starting Flask app on port {port}...")
    try:
        app.run(host='0.0.0.0', port=port, debug=True)
    finally:
        preprocessor.close_connection()

