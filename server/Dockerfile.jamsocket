# Use Python 3.9.6 as the base image
FROM python:3.9.6-slim

# Set the working directory in the container
WORKDIR /server

# Install pip if not already included in the slim image
RUN pip install --upgrade pip

# Copy the requirements.txt file to the container
COPY requirements.txt ./

# Install dependencies using requirements.txt
RUN pip install -r requirements.txt

# Copy the rest of your application's code
COPY . .

# Command to run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
