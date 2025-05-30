import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class ContentBasedRecommender:
    def __init__(self, movies_df):
        self.df = movies_df
        self.df["genres"] = self.df["genres"].apply(lambda x: " ".join([g["name"] for g in eval(x)]))
        self.df["features"] = self.df["genres"].astype(str) + " " + self.df["overview"].astype(str)
        self.tfidf = TfidfVectorizer(stop_words="english")
        self.tfidf_matrix = self.tfidf.fit_transform(self.df["features"])
        self.cosine_sim = cosine_similarity(self.tfidf_matrix)

    def get_recommendations(self, title):
        try:
            idx = self.df[self.df["title"] == title].index[0]
            sim_scores = list(enumerate(self.cosine_sim[idx]))
            sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
            movie_indices = [i[0] for i in sim_scores[1:11]]
            return self.df[["title", "release_date"]].iloc[movie_indices].to_dict('records')
        except IndexError:
            return [{"title": "Movie not found", "release_date": ""}]