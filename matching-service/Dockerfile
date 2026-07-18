FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/
COPY training/ training/
COPY models/ models/
COPY data/ data/

# Le modèle est déjà entraîné et fourni dans models/. Pour ré-entraîner à la
# construction de l'image (optionnel), décommenter les 2 lignes suivantes :
# RUN python training/generate_dataset.py --rows 10000
# RUN python training/train_model.py

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
