
try:
    import folium
    import streamlit_folium
    print("Folium and Streamlit-Folium imported successfully.")
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
