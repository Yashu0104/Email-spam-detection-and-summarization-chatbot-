pipeline {
    agent any

    environment {
        DOCKER_COMPOSE_FILE = 'docker-compose.yml'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/Yashu0104/Email-spam-detection-and-summarization-chatbot-.git'
            }
        }

        stage('Build Containers') {
            steps {
                script {
                    echo 'Building Docker images...'
                    bat "docker-compose -f %DOCKER_COMPOSE_FILE% build"
                }
            }
        }

        stage('Pre-deploy Cleanup') {
            steps {
                script {
                    echo 'Cleaning up any existing containers...'
                    bat "docker-compose -f %DOCKER_COMPOSE_FILE% down -v"
                }
            }
        }

        stage('Deploy Containers') {
            steps {
                script {
                    echo 'Deploying containers...'
                    bat "docker-compose -f %DOCKER_COMPOSE_FILE% up -d"
                }
            }
        }

        stage('Integration Tests') {
            steps {
                script {
                    echo 'Running integration tests...'
                    def status = bat(script: "docker-compose -f %DOCKER_COMPOSE_FILE% exec backend pytest", returnStatus: true)
                    if (status == 5) {
                        echo "No tests were collected. Skipping..."
                    } else if (status != 0) {
                        error "Integration tests failed with exit code ${status}"
                    } else {
                        echo "Integration tests passed."
                    }
                }
            }
        }
    }

    post {
        failure {
