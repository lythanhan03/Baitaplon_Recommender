import pandas as pd
import numpy as np
from sklearn.decomposition import TruncatedSVD

class CollaborativeRecommender:
    def __init__(self, ratings_df, tmdb_info, movie_id_to_tmdb):
        self.ratings_df = ratings_df
        self.tmdb_info = tmdb_info
        self.movie_id_to_tmdb = movie_id_to_tmdb
        self.user_id_map = {user_id: idx for idx, user_id in enumerate(ratings_df['userId'].unique())}
        self.movie_id_map = {movie_id: idx for idx, movie_id in enumerate(ratings_df['movieId'].unique())}
        self.build_model()

    def build_model(self):
        print("Building user-item matrix with Pandas...")
        # Tạo ma trận user-item
        user_item_matrix = pd.pivot_table(
            self.ratings_df,
            values='rating',
            index='userId',
            columns='movieId',
            fill_value=0
        )
        self.user_item_matrix = user_item_matrix
        print("Training SVD model with scikit-learn...")
        # Áp dụng SVD
        self.svd = TruncatedSVD(n_components=50)
        self.matrix_reduced = self.svd.fit_transform(user_item_matrix)

    def get_recommendations(self, user_id, top_n=10):
        if user_id not in self.user_id_map:
            print(f"User {user_id} not found, returning popular movies...")
            popular_movies = self.ratings_df.groupby('movieId')['rating'].mean().sort_values(ascending=False).head(top_n)
            return [
                {
                    'movieId': int(movie_id),  # Chuyển thành int
                    'title': self.tmdb_info.get(self.movie_id_to_tmdb.get(int(movie_id)), {}).get('title', 'Unknown'),
                    'score': float(score)
                }
                for movie_id, score in popular_movies.items()
            ]

        user_idx = self.user_id_map[user_id]
        # Dự đoán rating bằng SVD
        user_vector = self.matrix_reduced[user_idx]
        predicted_ratings = np.dot(user_vector, self.svd.components_)
        # Chỉ lấy phim chưa được đánh giá
        user_ratings = self.user_item_matrix.loc[user_id].values
        predicted_ratings[user_ratings > 0] = -1
        # Sắp xếp và lấy top phim
        recommended_indices = np.argsort(predicted_ratings)[::-1][:top_n]
        recommended_movies = []
        for idx in recommended_indices:
            if predicted_ratings[idx] > 0:
                movie_id = list(self.movie_id_map.keys())[list(self.movie_id_map.values()).index(idx)]
                tmdb_id = self.movie_id_to_tmdb.get(movie_id)
                title = self.tmdb_info.get(tmdb_id, {}).get('title', 'Unknown')
                recommended_movies.append({
                    'movieId': int(movie_id),  # Chuyển thành int
                    'title': title,
                    'score': float(predicted_ratings[idx])
                })
        return recommended_movies